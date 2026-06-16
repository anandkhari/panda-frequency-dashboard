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

export function filterByDateRange(joinedCustomers, payments, dateRange) {
  // ── Mode 1: number-based (existing logic, unchanged) ──────────────────────
  if (typeof dateRange === 'number') {
    if (dateRange === 0) return joinedCustomers
    const latest = getLatestPaymentDate(payments)
    const cutoff = new Date(latest)
    cutoff.setDate(cutoff.getDate() - dateRange)
    return joinedCustomers.filter(c => c.lastPayment >= cutoff)
  }

  // ── Mode 2: object-based (new absolute/year/custom modes) ─────────────────
  if (typeof dateRange === 'object' && dateRange !== null) {
    // monthToDate / yearToDate anchor to today's real date, not the latest
    // payment in the dataset — every other mode below stays dataset-anchored.
    if (dateRange.type === 'monthToDate') {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return joinedCustomers.filter(c => {
        const d = c.lastPayment instanceof Date ? c.lastPayment : new Date(c.lastPayment)
        return d >= start && d <= now
      })
    }

    if (dateRange.type === 'yearToDate') {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return joinedCustomers.filter(c => {
        const d = c.lastPayment instanceof Date ? c.lastPayment : new Date(c.lastPayment)
        return d >= start && d <= now
      })
    }

    const latest = getLatestPaymentDate(payments)
    let start, end

    if (dateRange.type === 'currentYear') {
      start = new Date(latest.getFullYear(), 0, 1)
      end = latest

    } else if (dateRange.type === 'lastYear') {
      const lastYear = latest.getFullYear() - 1
      start = new Date(lastYear, 0, 1)
      end = new Date(lastYear, 11, 31, 23, 59, 59)

    } else if (dateRange.type === 'year') {
      start = new Date(dateRange.year, 0, 1)
      end = new Date(dateRange.year, 11, 31, 23, 59, 59)

    } else if (dateRange.type === 'custom') {
      start = new Date(dateRange.start)
      end = new Date(dateRange.end)
      end.setHours(23, 59, 59, 999)

    } else {
      return joinedCustomers
    }

    return joinedCustomers.filter(c => {
      const d = c.lastPayment instanceof Date ? c.lastPayment : new Date(c.lastPayment)
      return d >= start && d <= end
    })
  }

  return joinedCustomers
}

// ── Available years helper ────────────────────────────────────────────────────

export function getAvailableYears(payments) {
  const years = new Set()
  payments.forEach(p => {
    const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)
    if (!isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return Array.from(years).sort((a, b) => b - a)
}
