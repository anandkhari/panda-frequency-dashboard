'use client'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function InlineBar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{fmt(value)}</div>
      <div className="w-full bg-gray-100 rounded-full h-1">
        <div className="h-1 rounded-full bg-[#185FA5]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BucketTable({ bucketStats, percentile, customerType }) {
  const showSubscribers = customerType === 'all'
  const maxLTV = Math.max(...bucketStats.map(b => b.totalLTV), 0)

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 mb-0.5">Bucket summary table</div>
      <div className="text-xs text-gray-400 mb-4">
        LTV averages and percentiles by customer segment
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Bucket</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Customers</th>
              <th className="text-left font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Total LTV</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Avg LTV</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">P{percentile} LTV</th>
              {showSubscribers && (
                <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Subscribers</th>
              )}
            </tr>
          </thead>
          <tbody>
            {bucketStats.map(b => (
              <tr key={b.bucket} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 border-b border-gray-50 font-medium text-gray-900">{b.bucket}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums text-gray-700">
                  {b.customers.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 min-w-32">
                  <InlineBar value={b.totalLTV} max={maxLTV} />
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums text-gray-700">
                  {fmt(b.avgLTV)}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums text-gray-700">
                  {fmt(b.percentileLTV)}
                </td>
                {showSubscribers && (
                  <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums text-gray-500">
                    {b.subscriberCount.toLocaleString()}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
