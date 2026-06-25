const PATTERN_DESCRIPTIONS = {
  weekly:     'Returns every week',
  biweekly:   'Returns every 2 weeks',
  monthly:    'Returns every month',
  quarterly:  'Returns every quarter',
  infrequent: 'Returns occasionally',
  single:     'No repeat bookings yet',
}

function capitalize(str) {
  if (!str) return '—'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDays(val) {
  if (!val || val === 0) return '—'
  return val === 1 ? '1 day' : `${val} days`
}

export default function KPIReturnIntervals({ returnIntervals, customerType = 'all' }) {
  const {
    avgGapDays        = 0,
    medianGapDays     = 0,
    fastestReturn     = 0,
    slowestReturn     = 0,
    mostCommonPattern = 'single',
    repeatersCount    = 0,
  } = returnIntervals || {}

  const cardClass  = "bg-white border-gray-100 dark:bg-[#242426] dark:border-[#2D2D2F] border rounded-xl p-5 flex flex-col"
  const labelClass = "text-gray-400 dark:text-[#6B6B70] text-xs uppercase tracking-wide mb-2"
  const valueClass = "text-gray-900 dark:text-[#F2F2F7] text-2xl font-semibold mb-1"
  const subClass   = "text-gray-400 dark:text-[#6B6B70] text-xs mt-auto"

  const repeatLabel =
    customerType === 'sub' ? 'Repeat subscribers'
    : customerType === 'non' ? 'Repeat non-subscribers'
    : 'Repeat customers'

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

        {/* Tile 1 — Avg return interval */}
        <div className={cardClass}>
          <div className={labelClass}>Avg return interval</div>
          <div className={valueClass}>{formatDays(avgGapDays)}</div>
          <div className={subClass}>Mean between bookings</div>
        </div>

        {/* Tile 2 — Median return interval */}
        <div className={cardClass}>
          <div className={labelClass}>Median interval</div>
          <div className={valueClass}>{formatDays(medianGapDays)}</div>
          <div className={subClass}>More reliable than avg</div>
        </div>

        {/* Tile 3 — Fastest return */}
        <div className={cardClass}>
          <div className={labelClass}>Fastest return</div>
          <div className={valueClass}>{formatDays(fastestReturn)}</div>
          <div className={subClass}>Quickest comeback</div>
        </div>

        {/* Tile 4 — Slowest return */}
        <div className={cardClass}>
          <div className={labelClass}>Slowest return</div>
          <div className={valueClass}>{formatDays(slowestReturn)}</div>
          <div className={subClass}>Longest gap between bookings</div>
        </div>

        {/* Tile 5 — Most common pattern 
        <div className={cardClass}>
          <div className={labelClass}>Most common pattern</div>
          <div className={valueClass}>{capitalize(mostCommonPattern)}</div>
          <div className={subClass}>{PATTERN_DESCRIPTIONS[mostCommonPattern] || '—'}</div>
        </div>*/}

        {/* Tile 5 — Repeat customers */}
        <div className={cardClass}>
          <div className={labelClass}>{repeatLabel}</div>
          <div className={valueClass}>{repeatersCount > 0 ? repeatersCount.toLocaleString() : '—'}</div>
          <div className={subClass}>Booked 2+ times</div>
        </div>

      </div>

      <p className="text-xs text-gray-400 dark:text-[#6B6B70] italic mt-3">
        Based on all-time data · not affected by date filter
      </p>
    </div>
  )
}
