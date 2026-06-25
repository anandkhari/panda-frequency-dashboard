import { BUCKETS } from './constants'

function sum(arr) { return arr.reduce((a, b) => a + b, 0) }
function avg(arr) { return arr.length ? sum(arr) / arr.length : 0 }

function computePercentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return Math.round(lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo))
}

// Duck-typed accessors — work for both old (netVolume/paymentCount) and
// new joined (net/bookingCount) record shapes so both dashboards share one file.
const getLTV = c => c.net ?? c.netVolume ?? 0
const getCount = c => c.bookingCount ?? c.paymentCount ?? 0

// Client's exact formula:
// MAX(0, ROUND(paymentCount - (refundedVolume + disputeLosses) / avgPkg))
// Small refunds round away naturally — no hard threshold needed.
export function computeAdjustedBookingCount(paymentCount, refundedVolume, disputeLosses, minPkg, avgPkg) {
  const reversed = refundedVolume + disputeLosses
  return Math.max(0, Math.round(paymentCount - (reversed / avgPkg)))
}

export function computeKPIs(customers, percentile = 50, repeatThreshold = 2) {
  const total = customers.length
  const ltvs = customers.map(getLTV)
  const totalLTV = sum(ltvs)
  const avgLTV = avg(ltvs)
  const percentileLTV = computePercentile(ltvs, percentile)
  const medianLTV = computePercentile(ltvs, 50)

  // Repeat rate: only customers with adjusted bookings > 0 (null-bucket excluded)
  const bucketable = customers.filter(c => c.bucket != null)
  const repeatCount = bucketable.filter(c => getCount(c) >= repeatThreshold).length
  const repeatRate = bucketable.length > 0 ? (repeatCount / bucketable.length) * 100 : 0

  // Health metrics: ALL customers including null-bucket
  const gross = sum(customers.map(c => c.gross ?? 0))
  const refunded = sum(customers.map(c => c.refunded ?? 0))
  const disputeLosses = sum(customers.map(c => c.disputeLosses ?? 0))
  const refundRate = gross > 0 ? ((refunded + disputeLosses) / gross) * 100 : 0

  return {
    totalCustomers: total,
    totalLTV,
    avgLTV,
    medianLTV,
    percentileLTV,
    repeatRate,
    gross,
    refunded,
    disputeLosses,
    net: totalLTV,
    refundRate,
  }
}

export function computeBucketStats(customers, percentile = 50) {
  // Customers with null bucket (adjusted count = 0) are excluded from
  // frequency distribution but their revenue still flows into health totals
  // via the HealthTable which uses the full customers array directly.
  const bucketable = customers.filter(c => c.bucket != null)

  return BUCKETS.map(bucket => {
    const group = bucketable.filter(c => c.bucket === bucket)
    const ltvs = group.map(getLTV)
    const totalLTV = sum(ltvs)
    const avgLTV = avg(ltvs)
    const percentileLTV = computePercentile(ltvs, percentile)
    const medianLTV = computePercentile(ltvs, 50)

    const gross = sum(group.map(c => c.gross ?? 0))
    const refunded = sum(group.map(c => c.refunded ?? 0))
    const disputeLosses = sum(group.map(c => c.disputeLosses ?? 0))
    const net = totalLTV
    const refundRate = gross > 0 ? ((refunded + disputeLosses) / gross) * 100 : 0
    const subscriberCount = group.filter(c => c.isSubscriber).length
    const nonSubscriberCount = group.length - subscriberCount

    return {
      bucket,
      customers: group.length,
      totalLTV,
      avgLTV,
      medianLTV,
      percentileLTV,
      subscriberCount,
      nonSubscriberCount,
      gross,
      refunded,
      disputeLosses,
      net,
      refundRate,
    }
  })
}

export function computeTipStats(customers) {
  // Only customers who have tipped
  const tippers = customers.filter(c => c.hasTipped)
  
  if (tippers.length === 0) {
    return {
      totalTipAmount:    0,
      tippingCustomers:  0,
      avgTipPerCustomer: 0,
      highestTip:        0,
      lowestTip:         0,
    }
  }

  const totalTipAmount = tippers.reduce(
    (sum, c) => sum + (c.tipTotal || 0), 0
  )
  
  const tippingCustomers = tippers.length
  
  const avgTipPerCustomer = tippingCustomers > 0
    ? Math.round(totalTipAmount / tippingCustomers)
    : 0
    
  const highestTip = Math.max(
    ...tippers.map(c => c.highestTip || 0)
  )
  
  const lowestTip = Math.min(
    ...tippers
      .filter(c => c.lowestTip > 0)
      .map(c => c.lowestTip)
  )

  return {
    totalTipAmount:    Math.round(totalTipAmount),
    tippingCustomers,
    avgTipPerCustomer,
    highestTip,
    lowestTip,
  }
}

export function computeReturnIntervals(customers) {
  const repeaters = customers.filter(
    c => (c.bookingCount ?? 0) >= 2 && (c.avgGapDays ?? 0) > 0
  )

  if (repeaters.length === 0) {
    return {
      avgGapDays:        0,
      medianGapDays:     0,
      fastestReturn:     0,
      slowestReturn:     0,
      mostCommonPattern: 'single',
      repeatersCount:    0,
      distribution: {
        weekly:     { count: 0, pct: 0 },
        biweekly:   { count: 0, pct: 0 },
        monthly:    { count: 0, pct: 0 },
        quarterly:  { count: 0, pct: 0 },
        infrequent: { count: 0, pct: 0 },
      },
    }
  }

  const allAvgGaps = repeaters.map(c => c.avgGapDays)

  const avgGapDays = Math.round(
    allAvgGaps.reduce((a, b) => a + b, 0) / allAvgGaps.length
  )

  const sortedGaps = [...allAvgGaps].sort((a, b) => a - b)
  const mid = Math.floor(sortedGaps.length / 2)
  const medianGapDays = sortedGaps.length % 2 === 0
    ? Math.round((sortedGaps[mid - 1] + sortedGaps[mid]) / 2)
    : sortedGaps[mid]

  const fastestReturn = Math.min(
    ...repeaters.map(c => c.minGapDays).filter(v => v > 0)
  )
  const slowestReturn = Math.max(...repeaters.map(c => c.maxGapDays))

  const total = repeaters.length
  const counts = {
    weekly:     repeaters.filter(c => c.returnPattern === 'weekly').length,
    biweekly:   repeaters.filter(c => c.returnPattern === 'biweekly').length,
    monthly:    repeaters.filter(c => c.returnPattern === 'monthly').length,
    quarterly:  repeaters.filter(c => c.returnPattern === 'quarterly').length,
    infrequent: repeaters.filter(c => c.returnPattern === 'infrequent').length,
  }

  const distribution = {}
  for (const [key, count] of Object.entries(counts)) {
    distribution[key] = {
      count,
      pct: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
    }
  }

  const mostCommonPattern = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

  return {
    avgGapDays,
    medianGapDays,
    fastestReturn,
    slowestReturn,
    mostCommonPattern,
    repeatersCount: total,
    distribution,
  }
}