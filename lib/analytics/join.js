import { NON_BOOKING_KEYWORDS, getBucket } from './constants'

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
        p.description.trim().toLowerCase() === 'subscription creation'
      )
      .map(p => p.customerId)
  )

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
        // outcome counts
        fullProfit: 0,
        partialRefund: 0,
        fullRefund: 0,
        // outcome amounts (for bookingOutcomes.js)
        fullProfitGross: 0,
        partialRefundGross: 0,
        partialRefundRefunded: 0,
        fullRefundGross: 0,
        firstPayment: payment.createdAt,
        lastPayment: payment.createdAt,
      }
    }

    const g = groups[cid]
    g.bookingCount++
    g.gross += payment.amount
    g.refunded += payment.amountRefunded
    if (payment.createdAt < g.firstPayment) g.firstPayment = payment.createdAt
    if (payment.createdAt > g.lastPayment) g.lastPayment = payment.createdAt

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

  // STEP 4 — join with customers, exclude net <= 0
  const joined = []
  for (const [customerId, g] of Object.entries(groups)) {
    const customer = customerMap[customerId]
    if (!customer) continue

    const net = g.gross - g.refunded
    if (net <= 0) continue

    joined.push({
      id: customerId,
      name: customer.name,
      email: customer.email,
      city: customer.city,
      country: customer.country,
      isSubscriber: subscriberIds.has(customerId),
      firebaseUid: customer.firebaseUid,
      // period booking metrics
      bookingCount: g.bookingCount,
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
      // lifetime metrics from customers CSV
      lifetimeSpend: customer.totalSpend,
      lifetimePayments: customer.paymentCount,
      lifetimeRefunds: customer.refundedVolume,
      disputeLosses: customer.disputeLosses,
      // derived — used by BUCKETS filter and charts
      bucket: getBucket(g.bookingCount),
      // aliases for backward compat with old metrics.js functions
      netVolume: net,
      paymentCount: g.bookingCount,
    })
  }

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
