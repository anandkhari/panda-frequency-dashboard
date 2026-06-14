import { supabase } from './supabase'

// ─── SAVE SNAPSHOT ────────────────────────────────────────────────────────────
// Called when admin uploads new CSV data. Always overwrites existing row
// for the country so there is at most one row per country at all times.
export async function saveSnapshot(country, payload) {
  // Step 1 — delete existing row for this country
  const { error: deleteError } = await supabase
    .from('dashboard_snapshots')
    .delete()
    .eq('country', country)

  if (deleteError) {
    throw new Error('Failed to clear existing snapshot: ' + deleteError.message)
  }

  // Step 2 — insert fresh row
  const { data, error: insertError } = await supabase
    .from('dashboard_snapshots')
    .insert({
      country,
      uploaded_at: new Date().toISOString(),
      payments_count: payload.payments_count,
      customers_count: payload.customers_count,
      latest_payment_date: payload.latest_payment_date,
      joined_customers: payload.joined_customers,
      subscriber_ids: payload.subscriber_ids,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error('Failed to save snapshot: ' + insertError.message)
  }

  // Step 3 — log to upload history (non-fatal on failure)
  const { error: historyError } = await supabase
    .from('upload_history')
    .insert({
      country,
      uploaded_at: new Date().toISOString(),
      payments_count: payload.payments_count,
      customers_count: payload.customers_count,
    })

  if (historyError) {
    console.warn('Failed to log upload history:', historyError.message)
  }

  return data
}

// ─── LOAD SNAPSHOT ────────────────────────────────────────────────────────────
// Load snapshot for one country. Returns null if no data exists yet.
export async function loadSnapshot(country) {
  const { data, error } = await supabase
    .from('dashboard_snapshots')
    .select('*')
    .eq('country', country)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no rows — not an error
    throw new Error('Failed to load snapshot: ' + error.message)
  }

  return data
}

// ─── LOAD ALL SNAPSHOTS ───────────────────────────────────────────────────────
// Load both countries in one query.
// Returns { canada: row|null, us: row|null }
export async function loadAllSnapshots() {
  const { data, error } = await supabase
    .from('dashboard_snapshots')
    .select('*')

  if (error) {
    throw new Error('Failed to load snapshots: ' + error.message)
  }

  const result = { canada: null, us: null }
  if (data) {
    data.forEach(row => {
      if (row.country === 'canada') result.canada = row
      if (row.country === 'us') result.us = row
    })
  }

  return result
}

// ─── HAS SNAPSHOT ─────────────────────────────────────────────────────────────
// Check if data exists for a country. Returns metadata object or null.
export async function hasSnapshot(country) {
  const { data } = await supabase
    .from('dashboard_snapshots')
    .select('id, uploaded_at, payments_count, customers_count')
    .eq('country', country)
    .single()

  return data || null
}

// ─── LOAD UPLOAD HISTORY ──────────────────────────────────────────────────────
// Returns last 20 upload events ordered newest-first.
export async function loadUploadHistory() {
  const { data, error } = await supabase
    .from('upload_history')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(20)

  if (error) {
    throw new Error('Failed to load history: ' + error.message)
  }

  return data || []
}
