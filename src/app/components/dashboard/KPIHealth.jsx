'use client'

import { useTheme } from 'next-themes'
import { getCustomerLabel } from '@/lib/customerLabel'

function fmtK(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString()
}

function Card({ label, value, sub, lightBg, darkBg, lightText, darkText }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <div className="rounded-lg p-3" style={{ background: isDark ? darkBg : lightBg }}>
      <div className="text-xs mb-1 tracking-wide" style={{ color: isDark ? darkText : lightText, opacity: 0.7 }}>
        {label}
      </div>
      <div className="text-2xl font-medium" style={{ color: isDark ? darkText : lightText }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: isDark ? darkText : lightText, opacity: 0.6 }}>
        {sub}
      </div>
    </div>
  )
}

export default function KPIHealth({ kpis, customerType = 'all' }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <Card
        label="Gross revenue"
        value={fmtK(kpis.gross)}
        sub="Before refunds"
        lightBg="#E6F1FB"
        darkBg="#2D2D2F"
        lightText="#185FA5"
        darkText="#93C5FD"
      />
      <Card
        label="Refund losses"
        value={fmtK(kpis.refunded)}
        sub={`Returned to ${getCustomerLabel(customerType, 2)}`}
        lightBg="#FCEBEB"
        darkBg="#2D2D2F"
        lightText="#A32D2D"
        darkText="#FCA5A5"
      />
      <Card
        label="Dispute losses"
        value={fmtK(kpis.disputeLosses)}
        sub="Chargebacks"
        lightBg="#FAEEDA"
        darkBg="#2D2D2F"
        lightText="#854F0B"
        darkText="#FCD34D"
      />
      <Card
        label="Net revenue"
        value={fmtK(kpis.net)}
        sub="Gross − refunds − disputes"
        lightBg="#EAF3DE"
        darkBg="#2D2D2F"
        lightText="#3B6D11"
        darkText="#86EFAC"
      />
      <Card
        label="Refund rate"
        value={kpis.refundRate.toFixed(1) + '%'}
        sub="(Refunds + disputes) / gross"
        lightBg="#F3F4F6"
        darkBg="#2D2D2F"
        lightText="#374151"
        darkText="#F2F2F7"
      />
    </div>
  )
}
