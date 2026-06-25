import { NON_BOOKING_KEYWORDS, getBucket, MIN_PKG_PRICE, AVG_PKG_PRICE } from './constants'
import { computeAdjustedBookingCount } from './metrics'

function computeGapStats(bookingDates) {
  if (!bookingDates || bookingDates.length < 2) {
    return {
      avgGapDays:    0,
      medianGapDays: 0,
      minGapDays:    0,
      maxGapDays:    0,
      returnPattern: 'single',
    }
  }

  const sorted = [...bookingDates].sort((a, b) => a - b)

  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round(
      (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24)
    )
    if (gap > 0) gaps.push(gap)
  }

  if (gaps.length === 0) {
    return {
      avgGapDays:    0,
      medianGapDays: 0,
      minGapDays:    0,
      maxGapDays:    0,
      returnPattern: 'single',
    }
  }

  const avgGapDays = Math.round(
    gaps.reduce((a, b) => a + b, 0) / gaps.length
  )

  const sortedGaps = [...gaps].sort((a, b) => a - b)
  const mid = Math.floor(sortedGaps.length / 2)
  const medianGapDays = sortedGaps.length % 2 === 0
    ? Math.round((sortedGaps[mid - 1] + sortedGaps[mid]) / 2)
    : sortedGaps[mid]

  const minGapDays = Math.min(...gaps)
  const maxGapDays = Math.max(...gaps)

  let returnPattern
  if (avgGapDays <= 7)        returnPattern = 'weekly'
  else if (avgGapDays <= 14)  returnPattern = 'biweekly'
  else if (avgGapDays <= 45)  returnPattern = 'monthly'
  else if (avgGapDays <= 120) returnPattern = 'quarterly'
  else                         returnPattern = 'infrequent'

  return { avgGapDays, medianGapDays, minGapDays, maxGapDays, returnPattern }
}

function isBookingPayment(payment) {
  if (payment.status !== 'Paid' && payment.status !== 'Refunded') return false
  const desc = (payment.description || '').toLowerCase()
  return !NON_BOOKING_KEYWORDS.some(kw => desc.includes(kw))
}

export function joinPaymentsAndCustomers(payments, customers) {
  // STEP 1 — find subscriber customer IDs
  const subscriberIds = new Set(
    payments
      .filter(p =>
        p.status === 'Paid' &&
        (p.description || '').trim().toLowerCase() === 'subscription creation'
      )
      .map(p => p.customerId)
  )

  console.log('--- DEBUG JOIN ---')
  console.log('Total Payments in memory:', payments.length)
  console.log('Total Customers in memory:', customers.length)
  console.log('Sample Payment CustomerID:', payments[0]?.customerId)
  console.log('Sample Customer ID:', customers[0]?.id)

  // STEP 2 — build customer lookup
  const customerMap = {}
  for (const c of customers) {
    customerMap[c.id] = c
  }

  // STEP 3 — group booking payments by customerId
  const groups = {}
  for (const payment of payments) {
    if (!isBookingPayment(payment)) continue
    const cid = payment.customerId
    if (!cid) continue

    if (!groups[cid]) {
      groups[cid] = {
        bookingCount: 0,
        gross: 0,
        refunded: 0,
        fullProfit: 0,
        partialRefund: 0,
        fullRefund: 0,
        fullProfitGross: 0,
        partialRefundGross: 0,
        partialRefundRefunded: 0,
        fullRefundGross: 0,
        firstPayment: payment.createdAt,
        lastPayment: payment.createdAt,
        bookingDates: [],
      }
    }

    const g = groups[cid]
    g.bookingCount++
    g.gross += payment.amount
    g.refunded += payment.amountRefunded
    if (payment.createdAt < g.firstPayment) g.firstPayment = payment.createdAt
    if (payment.createdAt > g.lastPayment) g.lastPayment = payment.createdAt
    const _d = payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt)
    if (!isNaN(_d.getTime())) g.bookingDates.push(_d)

    if (payment.amountRefunded === 0) {
      g.fullProfit++
      g.fullProfitGross += payment.amount
    } else if (payment.amount - payment.amountRefunded > 0) {
      g.partialRefund++
      g.partialRefundGross += payment.amount
      g.partialRefundRefunded += payment.amountRefunded
    } else {
      g.fullRefund++
      g.fullRefundGross += payment.amount
    }
  }

  // STEP 4 — main join: matched customers (exist in both sheets)
  const joined = []
  let matchedCount = 0

  for (const [customerId, g] of Object.entries(groups)) {
    const customer = customerMap[customerId]
    if (!customer) continue

    const net = g.gross - g.refunded
    if (g.gross <= 0) continue


const adjustedBookingCount = computeAdjustedBookingCount(
  g.bookingCount, // USE OUR FILTERED COUNT INSTEAD OF STRIPE'S RAW COUNT
  customer.refundedVolume,
  customer.disputeLosses || 0,
  MIN_PKG_PRICE,
  AVG_PKG_PRICE,
)

    // NEW: Collect tip data
    const tipPayments = payments.filter(p =>
      p.customerId === customerId &&
      (p.description || '').toLowerCase().includes('tip') &&
      p.status === 'Paid' &&
      p.amount > 0
    )
    const tipCount = tipPayments.length
    const tipTotal = tipPayments.reduce((sum, p) => sum + p.amount, 0)
    const highestTip = tipCount > 0 ? Math.max(...tipPayments.map(p => p.amount)) : 0
    const lowestTip = tipCount > 0 ? Math.min(...tipPayments.map(p => p.amount)) : 0

    const gapStats = computeGapStats(g.bookingDates)

    joined.push({
      id: customerId,
      name: customer.name,
      email: customer.email,
      city: customer.city,
      country: customer.country,
      isSubscriber: subscriberIds.has(customerId),
      isUnidentified: false,
      firebaseUid: customer.firebaseUid,
      bookingCount: adjustedBookingCount,
      rawBookingCount: customer.paymentCount,
      gross: g.gross,
      refunded: g.refunded,
      net,
      fullProfit: g.fullProfit,
      fullProfitGross: g.fullProfitGross,
      partialRefund: g.partialRefund,
      partialRefundGross: g.partialRefundGross,
      partialRefundRefunded: g.partialRefundRefunded,
      fullRefund: g.fullRefund,
      fullRefundGross: g.fullRefundGross,
      firstPayment: g.firstPayment,
      lastPayment: g.lastPayment,
      lifetimeSpend: customer.totalSpend,
      lifetimePayments: customer.paymentCount,
      lifetimeRefunds: customer.refundedVolume,
      disputeLosses: customer.disputeLosses,
      bucket: getBucket(adjustedBookingCount),
      netVolume: net,
      paymentCount: adjustedBookingCount,
      // NEW: Tip fields
      tipCount: tipCount,
      tipTotal: Math.round(tipTotal),
      hasTipped: tipCount > 0,
      highestTip: Math.round(highestTip),
      lowestTip: Math.round(lowestTip),
      // NEW: Return interval fields
      avgGapDays:    gapStats.avgGapDays,
      medianGapDays: gapStats.medianGapDays,
      minGapDays:    gapStats.minGapDays,
      maxGapDays:    gapStats.maxGapDays,
      returnPattern: gapStats.returnPattern,
    })
    matchedCount++
  }

  // STEP 5 — unmatched customers (payments sheet only, no customers sheet row)
  let unmatchedCount = 0
  let unmatchedRevenue = 0

  for (const [customerId, g] of Object.entries(groups)) {
    if (customerMap[customerId]) continue
    if (g.gross <= 0) continue

    const net = g.gross - g.refunded
    const adjustedUnmatched = computeAdjustedBookingCount(
      g.bookingCount,
      g.refunded,
      0,
      MIN_PKG_PRICE,
      AVG_PKG_PRICE,
    )

    // NEW: Collect tip data
    const tipPayments = payments.filter(p =>
      p.customerId === customerId &&
      (p.description || '').toLowerCase().includes('tip') &&
      p.status === 'Paid' &&
      p.amount > 0
    )
    const tipCount = tipPayments.length
    const tipTotal = tipPayments.reduce((sum, p) => sum + p.amount, 0)
    const highestTip = tipCount > 0 ? Math.max(...tipPayments.map(p => p.amount)) : 0
    const lowestTip = tipCount > 0 ? Math.min(...tipPayments.map(p => p.amount)) : 0

    const gapStats = computeGapStats(g.bookingDates)

    joined.push({
      id: customerId,
      name: 'Unidentified Customer',
      email: '',
      city: '',
      country: '',
      isSubscriber: subscriberIds.has(customerId),
      isUnidentified: true,
      firebaseUid: '',
      bookingCount: adjustedUnmatched,
      rawBookingCount: g.bookingCount,
      gross: g.gross,
      refunded: g.refunded,
      net,
      fullProfit: g.fullProfit,
      fullProfitGross: g.fullProfitGross,
      partialRefund: g.partialRefund,
      partialRefundGross: g.partialRefundGross,
      partialRefundRefunded: g.partialRefundRefunded,
      fullRefund: g.fullRefund,
      fullRefundGross: g.fullRefundGross,
      firstPayment: g.firstPayment,
      lastPayment: g.lastPayment,
      lifetimeSpend: g.gross,
      lifetimePayments: g.bookingCount,
      lifetimeRefunds: g.refunded,
      disputeLosses: 0,
      bucket: getBucket(adjustedUnmatched),
      netVolume: net,
      paymentCount: adjustedUnmatched,
      // NEW: Tip fields
      tipCount: tipCount,
      tipTotal: Math.round(tipTotal),
      hasTipped: tipCount > 0,
      highestTip: Math.round(highestTip),
      lowestTip: Math.round(lowestTip),
      // NEW: Return interval fields
      avgGapDays:    gapStats.avgGapDays,
      medianGapDays: gapStats.medianGapDays,
      minGapDays:    gapStats.minGapDays,
      maxGapDays:    gapStats.maxGapDays,
      returnPattern: gapStats.returnPattern,
    })
    unmatchedCount++
    unmatchedRevenue += g.gross
  }

  console.log('Matched customers:', matchedCount)
  console.log('Unmatched customers:', unmatchedCount)
  console.log('Total customers:', joined.length)
  console.log('Unmatched revenue:', '$' + Math.round(unmatchedRevenue).toLocaleString())

  return joined
}

export function prepareSavePayload(joinedCustomers, subscriberIds, payments, customers) {
  const latestPayment = payments.reduce((latest, p) => {
    const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)
    return d > latest ? d : latest
  }, new Date(0))

  return {
    joined_customers: joinedCustomers,
    subscriber_ids: Array.from(subscriberIds),
    payments_count: payments.length,
    customers_count: customers.length,
    latest_payment_date: latestPayment.toISOString(),
  }
}