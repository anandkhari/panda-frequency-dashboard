'use client'

import { getCustomerLabel } from '@/lib/customerLabel'

function fmt(n) { return '$' + Math.round(n).toLocaleString() }

function InlineBar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-[#8E8E93] mb-1">{fmt(value)}</div>
      <div className="w-full bg-gray-100 dark:bg-[#3A3A3C] rounded-full h-1">
        <div className="h-1 rounded-full bg-[#185FA5]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BucketTable({ bucketStats, percentile, customerType }) {
  const showSubscribers = customerType === 'all'
  const maxLTV = Math.max(...bucketStats.map(b => b.totalLTV), 0)

  return (
    <div className="bg-white dark:bg-[#242426] border border-gray-100 dark:border-[#2D2D2F] rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 dark:text-[#F2F2F7] mb-0.5">Bucket summary table</div>
      <div className="text-xs text-gray-400 dark:text-[#6B6B70] mb-4">
        LTV averages and percentiles by {getCustomerLabel(customerType, 1)} segment
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#2D2D2F]">
              <th className="text-left font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">Bucket</th>
              <th className="text-right font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">{getCustomerLabel(customerType, 2, true)}</th>
              <th className="text-left font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">Total LTV</th>
              <th className="text-right font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">Avg LTV</th>
              <th className="text-right font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">P{percentile} LTV</th>
              {showSubscribers && (
                <th className="text-right font-medium text-gray-500 dark:text-[#6B6B70] px-3 py-2 border-b border-gray-100 dark:border-[#2D2D2F]">Subscribers</th>
              )}
            </tr>
          </thead>
          <tbody>
            {bucketStats.map(b => (
              <tr key={b.bucket} className="hover:bg-gray-50 dark:hover:bg-[#2D2D2F] transition-colors">
                <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] font-medium text-gray-900 dark:text-[#F2F2F7]">{b.bucket}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] text-right tabular-nums text-gray-700 dark:text-[#F2F2F7]">
                  {b.customers.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] min-w-32">
                  <InlineBar value={b.totalLTV} max={maxLTV} />
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] text-right tabular-nums text-gray-700 dark:text-[#F2F2F7]">
                  {fmt(b.avgLTV)}
                </td>
                <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] text-right tabular-nums text-gray-700 dark:text-[#F2F2F7]">
                  {fmt(b.percentileLTV)}
                </td>
                {showSubscribers && (
                  <td className="px-3 py-2.5 border-b border-gray-50 dark:border-[#2D2D2F] text-right tabular-nums text-gray-500 dark:text-[#8E8E93]">
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
