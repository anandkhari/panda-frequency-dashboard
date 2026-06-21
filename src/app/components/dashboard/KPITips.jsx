export default function KPITips({ tipStats, customerType = 'all' }) {
  const {
    totalTipAmount = 0,
    tippingCustomers = 0,
    avgTipPerCustomer = 0,
    highestTip = 0,
    lowestTip = 0,
  } = tipStats || {}

  const formatMoney = (val) => {
    if (tipStats == null) return '—'
    return '$' + (val || 0).toLocaleString()
  }
  const formatNumber = (val) => {
    if (tipStats == null) return '—'
    return (val || 0).toLocaleString()
  }

  const getTippersLabel = () => {
    if (customerType === 'sub') return 'Tipping subscribers'
    if (customerType === 'non') return 'Tipping non-subscribers'
    return 'Tipping customers'
  }

  const getAvgLabel = () => {
    if (customerType === 'sub') return 'Avg tip / subscriber'
    if (customerType === 'non') return 'Avg tip / non-subscriber'
    return 'Avg tip / customer'
  }

  // Assuming standard rounded/padding for KPI tiles based on your standard aesthetic
  const cardClass = "bg-white border-gray-100 dark:bg-[#242426] dark:border-[#2D2D2F] border rounded-xl p-5 flex flex-col"
  const labelClass = "text-gray-400 dark:text-[#6B6B70] text-xs uppercase tracking-wide mb-2"
  const valueClass = "text-gray-900 dark:text-[#F2F2F7] text-2xl font-semibold mb-1"
  const subClass = "text-gray-400 dark:text-[#6B6B70] text-xs mt-auto"

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      
      {/* Tile 1 — Total tip amount */}
      <div className={cardClass}>
        <div className={labelClass}>Total tip amount</div>
        <div className={valueClass}>{formatMoney(totalTipAmount)}</div>
        <div className={subClass}>All tips collected</div>
      </div>

      {/* Tile 2 — Tipping customers */}
      <div className={cardClass}>
        <div className={labelClass}>{getTippersLabel()}</div>
        <div className={valueClass}>{formatNumber(tippingCustomers)}</div>
        <div className={subClass}>
          {customerType === 'sub' ? 'Subscribers who tipped'
            : customerType === 'non' ? 'Non-subscribers who tipped'
            : 'Customers who tipped'}
        </div>
      </div>

      {/* Tile 3 — Avg tip per customer */}
      <div className={cardClass}>
        <div className={labelClass}>{getAvgLabel()}</div>
        <div className={valueClass}>{formatMoney(avgTipPerCustomer)}</div>
        <div className={subClass}>Mean tip amount</div>
      </div>

      {/* Tile 4 — Highest tip */}
      <div className={cardClass}>
        <div className={labelClass}>Highest tip</div>
        <div className={valueClass}>{formatMoney(highestTip)}</div>
        <div className={subClass}>Single payment</div>
      </div>

      {/* Tile 5 — Lowest tip */}
      <div className={cardClass}>
        <div className={labelClass}>Lowest tip</div>
        <div className={valueClass}>{formatMoney(lowestTip)}</div>
        <div className={subClass}>Single payment</div>
      </div>

    </div>
  )
}