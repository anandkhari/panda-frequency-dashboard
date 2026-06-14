export function computeBookingOutcomes(joinedCustomers) {
  const totalBookings = joinedCustomers.reduce((s, c) => s + c.bookingCount, 0)

  const fullProfitCount = joinedCustomers.reduce((s, c) => s + c.fullProfit, 0)
  const fullProfitRevenue = joinedCustomers.reduce((s, c) => s + c.fullProfitGross, 0)

  const partialRefundCount = joinedCustomers.reduce((s, c) => s + c.partialRefund, 0)
  const partialRefundGrossLost = joinedCustomers.reduce((s, c) => s + c.partialRefundRefunded, 0)
  const partialRefundKept = joinedCustomers.reduce(
    (s, c) => s + (c.partialRefundGross - c.partialRefundRefunded), 0
  )

  const fullRefundCount = joinedCustomers.reduce((s, c) => s + c.fullRefund, 0)
  const fullRefundLoss = joinedCustomers.reduce((s, c) => s + c.fullRefundGross, 0)

  const disputeCustomers = joinedCustomers.filter(c => c.disputeLosses > 0)
  const disputeCount = disputeCustomers.length
  const disputeLoss = joinedCustomers.reduce((s, c) => s + c.disputeLosses, 0)

  return {
    totalBookings,
    fullProfit: {
      count: fullProfitCount,
      revenue: fullProfitRevenue,
    },
    partialRefund: {
      count: partialRefundCount,
      grossLost: partialRefundGrossLost,
      kept: partialRefundKept,
    },
    fullRefund: {
      count: fullRefundCount,
      totalLoss: fullRefundLoss,
    },
    disputeLoss: {
      count: disputeCount,
      totalLoss: disputeLoss,
    },
  }
}
