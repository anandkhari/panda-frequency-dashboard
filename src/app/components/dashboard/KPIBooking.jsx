import { getFilterLabel } from '@/lib/analytics/filter'
import { getCustomerLabel } from '@/lib/customerLabel'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }
function fmtK(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return fmt(n)
}

function Card({ label, value, sub }) {
  return (
    <div className="bg-gray-50 dark:bg-[#2D2D2F] rounded-lg p-3">
      <div className="text-xs text-gray-400 dark:text-[#6B6B70] mb-1 tracking-wide">{label}</div>
      <div className="text-2xl font-medium text-gray-900 dark:text-[#F2F2F7]">{value}</div>
      <div className="text-xs text-gray-500 dark:text-[#8E8E93] mt-0.5">{sub}</div>
    </div>
  )
}

export default function KPIBooking({ kpis, dateRange, percentile, repeatThreshold, customerType = 'all' }) {
  const rangeLabel = getFilterLabel(dateRange)
  const nLabel = repeatThreshold === 1 ? '1+ booking' : `${repeatThreshold}+ bookings`

  const customerLabel =
    customerType === 'sub' ? 'Total subscribers' :
    customerType === 'non' ? 'Total non-subscribers' :
    'Total customers'

  const avgLabel =
    customerType === 'sub' ? 'Avg LTV / subscriber' :
    customerType === 'non' ? 'Avg LTV / non-subscriber' :
    'Avg LTV / customer'

  const repeatSub =
    customerType === 'sub' ? `Subscribers made ${nLabel}` :
    customerType === 'non' ? `Non-subscribers made ${nLabel}` :
    `Made ${nLabel}`

  const meanLabel =
    customerType === 'sub' ? 'Mean across subscribers' :
    customerType === 'non' ? 'Mean across non-subscribers' :
    'Mean across segments'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      <Card
        label={customerLabel}
        value={kpis.totalCustomers.toLocaleString()}
        sub={rangeLabel}
      />
      <Card
        label="Total LTV"
        value={fmtK(kpis.totalLTV)}
        sub="Sum of net revenue"
      />
      <Card
        label={avgLabel}
        value={fmt(kpis.avgLTV)}
        sub={meanLabel}
      />
      <Card
        label={`P${percentile} LTV`}
        value={fmt(kpis.percentileLTV)}
        sub={`${percentile}th percentile`}
      />
      <Card
        label="Repeat rate"
        value={kpis.repeatRate.toFixed(1) + '%'}
        sub={repeatSub}
      />
    </div>
  )
}
