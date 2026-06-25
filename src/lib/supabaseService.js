import { supabase } from './supabase'

// ─── SAVE SNAPSHOT ────────────────────────────────────────────────────────────
// Called when admin uploads new CSV data. Always overwrites existing rows
// for the country so there is at most one snapshot per country at all times.
const CUSTOMER_BATCH_SIZE = 1000

function formatDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString().slice(0, 10)
}

function toCustomerRow(country, customer) {
  return {
    country,
    customer_id: customer.id,
    name: customer.name,
    is_subscriber: customer.isSubscriber,
    is_unidentified: customer.isUnidentified,
    booking_count: customer.bookingCount,
    gross: customer.gross,
    refunded: customer.refunded,
    net: customer.net,
    dispute_losses: customer.disputeLosses || 0,
    full_profit: customer.fullProfit || 0,
    full_profit_gross: Math.round(customer.fullProfitGross || 0),
    partial_refund: customer.partialRefund || 0,
    partial_refund_gross: Math.round(customer.partialRefundGross || 0),
    partial_refund_refunded: Math.round(customer.partialRefundRefunded || 0),
    full_refund: customer.fullRefund || 0,
    full_refund_gross: Math.round(customer.fullRefundGross || 0),
    last_payment: formatDate(customer.lastPayment),
    first_payment: formatDate(customer.firstPayment),
    bucket: customer.bucket,
    // NEW: Tip fields for storage
    tip_count: customer.tipCount || 0,
    tip_total: customer.tipTotal || 0,
    has_tipped: customer.hasTipped || false,
    highest_tip: customer.highestTip || 0,
    lowest_tip: customer.lowestTip || 0,
    // NEW: Return interval fields
    avg_gap_days:    customer.avgGapDays    || 0,
    median_gap_days: customer.medianGapDays || 0,
    min_gap_days:    customer.minGapDays    || 0,
    max_gap_days:    customer.maxGapDays    || 0,
    return_pattern:  customer.returnPattern || 'single',
  }
}

// ─── RETRY HELPERS ────────────────────────────────────────────────────────────
async function insertBatchWithRetry(tableName, batch, maxRetries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase
      .from(tableName)
      .insert(batch)

    if (!error) return

    console.warn(
      `Batch insert attempt ${attempt}/${maxRetries} failed:`,
      error.message
    )

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, delayMs))
    } else {
      throw new Error(
        `Batch failed after ${maxRetries} attempts: ` +
        error.message
      )
    }
  }
}

async function deleteWithRetry(tableName, column, value, maxRetries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq(column, value)

    if (!error) return

    console.warn(
      `Delete attempt ${attempt}/${maxRetries} failed:`,
      error.message
    )

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, delayMs))
    } else {
      throw new Error(
        `Delete failed after ${maxRetries} attempts: ` +
        error.message
      )
    }
  }
}

export async function saveSnapshot(country, payload) {
  // Step 1 — delete existing customer rows for this country
  await deleteWithRetry('customer_snapshots', 'country', country)

  // Step 2 — upsert metadata into dashboard_snapshots
  const { data, error: upsertError } = await supabase
    .from('dashboard_snapshots')
    .upsert({
      country,
      uploaded_at: new Date().toISOString(),
      payments_count: payload.payments_count,
      customers_count: payload.customers_count,
      latest_payment_date: payload.latest_payment_date,
      subscriber_ids: payload.subscriber_ids,
    }, { onConflict: 'country' })
    .select()
    .single()

  if (upsertError) {
    throw new Error('Failed to save snapshot: ' + upsertError.message)
  }

  // Step 3 — batch insert customers in groups of 1000
  const customerRows = payload.joined_customers.map(c => toCustomerRow(country, c))

  for (let i = 0; i < customerRows.length; i += CUSTOMER_BATCH_SIZE) {
    const batch = customerRows.slice(i, i + CUSTOMER_BATCH_SIZE)
    await insertBatchWithRetry('customer_snapshots', batch)
  }

  // Step 4 — log to upload history (non-fatal on failure)
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

// ─── LOAD CUSTOMER ROWS ───────────────────────────────────────────────────────
// Loads all customer_snapshots rows for a country (paginated, since a country
// can have more rows than Supabase's default page size) and converts them
// back to the joined-customer shape used throughout the app.
function toJoinedCustomer(r) {
  return {
    id: r.customer_id,
    name: r.name || 'Unidentified Customer',
    isSubscriber: r.is_subscriber,
    isUnidentified: r.is_unidentified,
    bookingCount: r.booking_count,
    gross: r.gross,
    refunded: r.refunded,
    net: r.net,
    disputeLosses: r.dispute_losses,
    fullProfit: r.full_profit,
    fullProfitGross: r.full_profit_gross,
    partialRefund: r.partial_refund,
    partialRefundGross: r.partial_refund_gross,
    partialRefundRefunded: r.partial_refund_refunded,
    fullRefund: r.full_refund,
    fullRefundGross: r.full_refund_gross,
    lastPayment: r.last_payment ? new Date(r.last_payment) : null,
    firstPayment: r.first_payment ? new Date(r.first_payment) : null,
    bucket: r.bucket,
    email: '',
    city: '',
    country: '',
    // NEW: Tip fields for hydration
    tipCount: r.tip_count || 0,
    tipTotal: r.tip_total || 0,
    hasTipped: r.has_tipped || false,
    highestTip: r.highest_tip || 0,
    lowestTip: r.lowest_tip || 0,
    // NEW: Return interval fields
    avgGapDays:    r.avg_gap_days    || 0,
    medianGapDays: r.median_gap_days || 0,
    minGapDays:    r.min_gap_days    || 0,
    maxGapDays:    r.max_gap_days    || 0,
    returnPattern: r.return_pattern  || 'single',
  }
}

const CUSTOMER_PAGE_SIZE = 1000

async function loadCustomerRows(country) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('customer_snapshots')
      .select('*')
      .eq('country', country)
      .range(from, from + CUSTOMER_PAGE_SIZE - 1)

    if (error) {
      throw new Error('Failed to load customer snapshot: ' + error.message)
    }

    rows.push(...data)
    if (data.length < CUSTOMER_PAGE_SIZE) break
    from += CUSTOMER_PAGE_SIZE
  }

  return rows.map(toJoinedCustomer)
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

  const joined_customers = await loadCustomerRows(country)

  return { ...data, joined_customers }
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
    for (const row of data) {
      if (row.country !== 'canada' && row.country !== 'us') continue
      const joined_customers = await loadCustomerRows(row.country)
      result[row.country] = { ...row, joined_customers }
    }
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

// ─── PUBLISH SNAPSHOT ─────────────────────────────────────────────────────────
function generateSlug() {
  return Math.random().toString(36).substring(2, 8)
}

async function insertPublishedCustomers(slug, country, joinedCustomers) {
  const customerRows = joinedCustomers.map(c => ({ slug, ...toCustomerRow(country, c) }))

  for (let i = 0; i < customerRows.length; i += CUSTOMER_BATCH_SIZE) {
    const batch = customerRows.slice(i, i + CUSTOMER_BATCH_SIZE)
    await insertBatchWithRetry('published_customers', batch)
  }
}

export async function publishSnapshot(canadaData, usData) {
  const slug = generateSlug()

  const { data, error } = await supabase
    .from('published_snapshots')
    .insert({
      id: crypto.randomUUID(),
      slug,
      created_at: new Date().toISOString(),
      canada_meta: canadaData ? {
        uploaded_at: canadaData.uploaded_at,
        payments_count: canadaData.payments_count,
        customers_count: canadaData.customers_count,
        latest_payment_date: canadaData.latest_payment_date,
        subscriber_ids: canadaData.subscriber_ids,
      } : null,
      us_meta: usData ? {
        uploaded_at: usData.uploaded_at,
        payments_count: usData.payments_count,
        customers_count: usData.customers_count,
        latest_payment_date: usData.latest_payment_date,
        subscriber_ids: usData.subscriber_ids,
      } : null,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to publish: ' + error.message)

  if (canadaData) {
    await insertPublishedCustomers(slug, 'canada', canadaData.joined_customers)
  }
  if (usData) {
    await insertPublishedCustomers(slug, 'us', usData.joined_customers)
  }

  return { slug, data }
}

// ─── LOAD PUBLISHED SNAPSHOT ──────────────────────────────────────────────────
async function loadPublishedCustomerRows(slug) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('published_customers')
      .select('*')
      .eq('slug', slug)
      .range(from, from + CUSTOMER_PAGE_SIZE - 1)

    if (error) {
      throw new Error('Failed to load published customers: ' + error.message)
    }

    rows.push(...data)
    if (data.length < CUSTOMER_PAGE_SIZE) break
    from += CUSTOMER_PAGE_SIZE
  }

  return rows
}

export async function loadPublishedSnapshot(slug) {
  const { data, error } = await supabase
    .from('published_snapshots')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('Failed to load snapshot: ' + error.message)
  }

  const rows = await loadPublishedCustomerRows(slug)

  const canada_data = rows.filter(r => r.country === 'canada').map(toJoinedCustomer)
  const us_data = rows.filter(r => r.country === 'us').map(toJoinedCustomer)

  return { ...data, canada_data, us_data }
}

// ─── LOAD LATEST PUBLISHED SNAPSHOT ──────────────────────────────────────────
export async function loadLatestSnapshot() {
  const { data, error } = await supabase
    .from('published_snapshots')
    .select('slug, created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error('Failed to load latest: ' + error.message)
  }

  return data
}

// ─── LOAD PUBLISHED HISTORY ───────────────────────────────────────────────────
export async function loadPublishedHistory() {
  const { data, error } = await supabase
    .from('published_snapshots')
    .select('id, slug, created_at, label, canada_meta, us_meta')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error('Failed to load history: ' + error.message)

  return data || []
}

// ─── DELETE PUBLISHED SNAPSHOT ───────────────────────────────────────────────
export async function deletePublishedSnapshot(slug) {
  const { error: customerError } = await supabase
    .from('published_customers')
    .delete()
    .eq('slug', slug)

  if (customerError) {
    throw new Error('Failed to delete published customers: ' + customerError.message)
  }

  const { error: snapError } = await supabase
    .from('published_snapshots')
    .delete()
    .eq('slug', slug)

  if (snapError) {
    throw new Error('Failed to delete published snapshot: ' + snapError.message)
  }

  return true
}

/*
IMPORTANT: Run this SQL in Supabase before uploading new data:

ALTER TABLE customer_snapshots
  ADD COLUMN IF NOT EXISTS avg_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS median_gap_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_pattern  text    DEFAULT 'single';

ALTER TABLE published_customers
  ADD COLUMN IF NOT EXISTS tip_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_tipped boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS highest_tip integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lowest_tip integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS median_gap_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_gap_days    integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS return_pattern  text    DEFAULT 'single';
*/