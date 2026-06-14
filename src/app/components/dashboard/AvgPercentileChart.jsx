import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2">
      <p className="text-xs font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs mt-0.5" style={{ color: p.fill }}>
          {p.name}: ${Math.round(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

const SERIES = [
  { key: 'allAvg',    label: 'All — Avg',    color: '#185FA5' },
  { key: 'allPct',    label: 'All — P{p}',   color: '#85B7EB' },
  { key: 'subAvg',    label: 'Sub — Avg',    color: '#639922' },
  { key: 'nonAvg',    label: 'Non-sub — Avg',color: '#97C459' },
]

export default function AvgPercentileChart({ allBucketStats, subBucketStats, nonBucketStats, percentile }) {
  const pLabel = `P${percentile}`

  const data = allBucketStats.map((b, i) => ({
    bucket: b.bucket,
    'All — Avg': Math.round(b.avgLTV),
    [`All — ${pLabel}`]: Math.round(b.percentileLTV),
    'Sub — Avg': Math.round(subBucketStats[i]?.avgLTV ?? 0),
    'Non-sub — Avg': Math.round(nonBucketStats[i]?.avgLTV ?? 0),
  }))

  const seriesWithLabel = [
    { key: 'All — Avg',         color: '#185FA5' },
    { key: `All — ${pLabel}`,   color: '#85B7EB' },
    { key: 'Sub — Avg',         color: '#639922' },
    { key: 'Non-sub — Avg',     color: '#97C459' },
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 mb-0.5">
        Avg vs P{percentile} LTV by bucket
      </div>
      <div className="text-xs text-gray-400 mb-4">
        Compared across all customers, subscribers, and non-subscribers
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        {seriesWithLabel.map(s => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
            {s.key}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => '$' + v} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          {seriesWithLabel.map(s => (
            <Bar key={s.key} dataKey={s.key} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={20} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
