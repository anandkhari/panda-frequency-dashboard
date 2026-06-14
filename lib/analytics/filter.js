// ── Old API (kept for backward compat with single-CSV Canada dashboard) ──────

export function getLatestDate(customers) {
  return customers.reduce((latest, c) =>
    c.lastPayment > latest ? c.lastPayment : latest
  , new Date(0))
}

export function filterCustomers(customers, dateRange) {
  if (dateRange === 0) return customers
  const latest = getLatestDate(customers)
  const cutoff = new Date(latest)
  cutoff.setDate(cutoff.getDate() - dateRange)
  return customers.filter(c => c.lastPayment >= cutoff)
}

// ── New API (used by the multi-country dashboard) ─────────────────────────────

export function getLatestPaymentDate(payments) {
  return payments.reduce((latest, p) =>
    p.createdAt > latest ? p.createdAt : latest
  , new Date(0))
}

export function filterByDateRange(joinedCustomers, payments, days) {
  if (days === 0) return joinedCustomers
  const latest = getLatestPaymentDate(payments)
  const cutoff = new Date(latest)
  cutoff.setDate(cutoff.getDate() - days)
  return joinedCustomers.filter(c => c.lastPayment >= cutoff)
}
