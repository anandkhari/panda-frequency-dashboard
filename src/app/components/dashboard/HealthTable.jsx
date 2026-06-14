function fmtK(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'm'
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'k'
  return '$' + Math.round(n).toLocaleString()
}

function RefundBadge({ rate }) {
  const isHigh = rate > 10
  return (
    <span
      className="text-xs font-medium px-1.5 py-0.5 rounded"
      style={{
        background: isHigh ? '#FCEBEB' : '#EAF3DE',
        color: isHigh ? '#A32D2D' : '#3B6D11',
      }}
    >
      {rate.toFixed(1)}%
    </span>
  )
}

export default function HealthTable({ allBucketStats }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="text-sm font-medium text-gray-900 mb-0.5">Business health by bucket</div>
      <div className="text-xs text-gray-400 mb-4">
        Gross, refunds, disputes, and net revenue across all customers
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Bucket</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Gross</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100" style={{ color: '#A32D2D' }}>Refunds</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100" style={{ color: '#854F0B' }}>Disputes</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100" style={{ color: '#3B6D11' }}>Net</th>
              <th className="text-right font-medium text-gray-500 px-3 py-2 border-b border-gray-100">Refund rate</th>
            </tr>
          </thead>
          <tbody>
            {allBucketStats.map(b => (
              <tr key={b.bucket} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 border-b border-gray-50 font-medium text-gray-900">{b.bucket}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums text-gray-700">{fmtK(b.gross)}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums" style={{ color: '#A32D2D' }}>{fmtK(b.refunded)}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums" style={{ color: '#854F0B' }}>{fmtK(b.disputeLosses)}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right tabular-nums font-medium" style={{ color: '#3B6D11' }}>{fmtK(b.net)}</td>
                <td className="px-3 py-2.5 border-b border-gray-50 text-right">
                  <RefundBadge rate={b.refundRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
