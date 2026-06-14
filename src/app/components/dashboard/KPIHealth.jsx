function fmtK(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString()
}

function Card({ label, value, sub, bg, text }) {
  return (
    <div className="rounded-lg p-3" style={{ background: bg }}>
      <div className="text-xs mb-1 tracking-wide" style={{ color: text, opacity: 0.7 }}>{label}</div>
      <div className="text-2xl font-medium" style={{ color: text }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: text, opacity: 0.6 }}>{sub}</div>
    </div>
  )
}

export default function KPIHealth({ kpis }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <Card
        label="Gross revenue"
        value={fmtK(kpis.gross)}
        sub="Before refunds"
        bg="#E6F1FB"
        text="#185FA5"
      />
      <Card
        label="Refund losses"
        value={fmtK(kpis.refunded)}
        sub="Returned to customers"
        bg="#FCEBEB"
        text="#A32D2D"
      />
      <Card
        label="Dispute losses"
        value={fmtK(kpis.disputeLosses)}
        sub="Chargebacks"
        bg="#FAEEDA"
        text="#854F0B"
      />
      <Card
        label="Net revenue"
        value={fmtK(kpis.net)}
        sub="Gross − refunds − disputes"
        bg="#EAF3DE"
        text="#3B6D11"
      />
      <Card
        label="Refund rate"
        value={kpis.refundRate.toFixed(1) + '%'}
        sub="(Refunds + disputes) / gross"
        bg="#F3F4F6"
        text="#374151"
      />
    </div>
  )
}
