function fmtK(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString()
}

function pct(count, total) {
  return total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%'
}

function OutcomeCard({ title, count, total, lines, bg, border, titleColor }) {
  return (
    <div className={`rounded-xl border-2 p-4`} style={{ background: bg, borderColor: border }}>
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: titleColor }}>
        {title}
      </div>
      <div className="text-2xl font-semibold text-gray-900 mb-0.5">
        {count.toLocaleString()}
        <span className="text-xs font-normal text-gray-400 ml-2">bookings</span>
      </div>
      <div className="text-xs text-gray-400 mb-3">{pct(count, total)} of total</div>
      {lines.map((line, i) => (
        <div key={i} className="text-xs text-gray-600 mt-1">{line}</div>
      ))}
    </div>
  )
}

export default function BookingOutcomes({ outcomes }) {
  const { totalBookings, fullProfit, partialRefund, fullRefund, disputeLoss } = outcomes

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <OutcomeCard
        title="Full profit"
        count={fullProfit.count}
        total={totalBookings}
        lines={[`Revenue kept: ${fmtK(fullProfit.revenue)}`]}
        bg="#EAF3DE"
        border="#97C459"
        titleColor="#3B6D11"
      />
      <OutcomeCard
        title="Partial refund"
        count={partialRefund.count}
        total={totalBookings}
        lines={[
          `Lost to refund: ${fmtK(partialRefund.grossLost)}`,
          `Kept: ${fmtK(partialRefund.kept)}`,
        ]}
        bg="#FAEEDA"
        border="#D4A017"
        titleColor="#854F0B"
      />
      <OutcomeCard
        title="Full refund"
        count={fullRefund.count}
        total={totalBookings}
        lines={[`Total loss: ${fmtK(fullRefund.totalLoss)}`]}
        bg="#FCEBEB"
        border="#E57373"
        titleColor="#A32D2D"
      />
      <OutcomeCard
        title="Dispute loss"
        count={disputeLoss.count}
        total={totalBookings}
        lines={[`Total loss: ${fmtK(disputeLoss.totalLoss)}`]}
        bg="#F3F0FF"
        border="#A78BFA"
        titleColor="#5B21B6"
      />
    </div>
  )
}
