'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useDashboard } from '@/hooks/useDashboard'
import SidePanel from '@/components/dashboard/SidePanel'

const Plot = dynamic(
  () => import('react-plotly.js'),
  { ssr: false }
)

const BUCKET_INDEX = {
  '1 booking':   1,
  '2 bookings':  2,
  '3 bookings':  3,
  '4 bookings':  4,
  '5+ bookings': 5,
}

const ROWS_PER_PAGE = 50

function stableIndex(id) {
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++)
    h = Math.abs(((h << 5) - h) + s.charCodeAt(i)) | 0
  return h
}

function jitter(seed, offset) {
  const x = Math.sin(seed + offset) * 10000
  const frac = x - Math.floor(x)
  return (frac - 0.5) * 0.28
}

function xPos(c) {
  const bi = BUCKET_INDEX[c.bucket]
  const seed = stableIndex(c.id || '')
  return bi + jitter(seed, bi * 1000) * 0.35
}

function exportToCSV(customers) {
  const headers = [
    'Name', 'Email', 'Bucket', 'LTV',
    'Gross', 'Refunded', 'Bookings',
    'Tips', 'Segment', 'First Payment',
    'Last Payment',
  ]

  const rows = customers.map(c => [
    c.name || 'Unidentified Customer',
    c.email || '',
    c.bucket || '',
    c.net ?? 0,
    c.gross ?? 0,
    c.refunded ?? 0,
    c.bookingCount ?? 0,
    c.tipTotal ?? 0,
    c.isSubscriber ? 'Subscriber' : 'Non-subscriber',
    c.firstPayment ? new Date(c.firstPayment).toLocaleDateString('en-US') : '',
    c.lastPayment ? new Date(c.lastPayment).toLocaleDateString('en-US') : '',
  ])

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `panda_customers_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ScatterPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const [dotFilter, setDotFilter] = useState('all')
  const [view, setView] = useState('scatter')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('net')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const {
    country, setCountry,
    customerType, setCustomerType,
    dateRange, setDateRange,
    percentile, rawPercentile,
    setRawPercentile,
    repeatThreshold, rawRepeatThreshold,
    setRawRepeatThreshold,
    filteredCustomers,
    isReady,
    isLoadingFromSupabase,
  } = useDashboard()

  const displayCustomers = useMemo(() => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const filterFn =
      dotFilter === 'top'      ? c => (c.net ?? 0) > 1000
      : dotFilter === 'frequent' ? c => (c.bookingCount ?? 0) >= 6
      : dotFilter === 'loyal'    ? c => c.firstPayment && new Date(c.firstPayment) < oneYearAgo
      : dotFilter === 'generous' ? c => (c.tipTotal ?? 0) > 100
      : () => true

    return filteredCustomers
      .filter(c =>
        c.bucket != null &&
        BUCKET_INDEX[c.bucket] !== undefined &&
        (c.net ?? 0) > 0
      )
      .filter(filterFn)
  }, [filteredCustomers, dotFilter])

  const scatterCustomers = useMemo(() => {
    if (dotFilter === 'all') return displayCustomers.slice(0, 1000)
    return displayCustomers
  }, [displayCustomers, dotFilter])

  const tableCustomers = useMemo(() => {
    let rows = [...displayCustomers]

    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter(c => (c.name || '').toLowerCase().includes(q))
    }

    rows.sort((a, b) => {
      const aVal = a[sortBy] ?? 0
      const bVal = b[sortBy] ?? 0
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

    return rows
  }, [displayCustomers, search, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(tableCustomers.length / ROWS_PER_PAGE))
  const pageRows = tableCustomers.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  )

  const { subTrace, nonSubTrace } = useMemo(() => {
    const subscribers    = scatterCustomers.filter(c => c.isSubscriber)
    const nonSubscribers = scatterCustomers.filter(c => !c.isSubscriber)

    const sub = {
      type: 'scatter',
      mode: 'markers',
      name: 'Subscriber',
      x: subscribers.map(c => xPos(c)),
      y: subscribers.map(c => c.net ?? 0),
      text: subscribers.map(c =>
        `${c.name || 'Unidentified'}<br>` +
        `LTV: $${(c.net ?? 0).toLocaleString()}<br>` +
        `Bookings: ${c.bookingCount ?? '—'}<br>` +
        `Segment: Subscriber`
      ),
      hoverinfo: 'text',
      marker: {
        symbol: 'circle',
        size: 6,
        color: 'rgba(24,95,165,0.5)',
        line: { color: 'rgba(24,95,165,0.8)', width: 0.5 },
      },
    }

    const nonSub = {
      type: 'scatter',
      mode: 'markers',
      name: 'Non-subscriber',
      x: nonSubscribers.map(c => xPos(c)),
      y: nonSubscribers.map(c => c.net ?? 0),
      text: nonSubscribers.map(c =>
        `${c.name || 'Unidentified'}<br>` +
        `LTV: $${(c.net ?? 0).toLocaleString()}<br>` +
        `Bookings: ${c.bookingCount ?? '—'}<br>` +
        `Segment: Non-subscriber`
      ),
      hoverinfo: 'text',
      marker: {
        symbol: 'triangle-up',
        size: 6,
        color: 'rgba(99,153,34,0.5)',
        line: { color: 'rgba(99,153,34,0.8)', width: 0.5 },
      },
    }

    return { subTrace: sub, nonSubTrace: nonSub }
  }, [scatterCustomers])

  const traces = useMemo(() => {
    if (customerType === 'sub') return [subTrace]
    if (customerType === 'non') return [nonSubTrace]
    return [subTrace, nonSubTrace]
  }, [subTrace, nonSubTrace, customerType])

  const layout = useMemo(() => ({
    paper_bgcolor: 'transparent',
    plot_bgcolor:  'transparent',
    margin: { t: 20, r: 20, b: 60, l: 70 },
    font: { color: isDark ? '#AEAEB2' : '#6b7280' },
    xaxis: {
      title: 'Booking bucket',
      tickmode: 'array',
      tickvals: [1, 2, 3, 4, 5],
      ticktext: ['1 booking', '2 bookings', '3 bookings', '4 bookings', '5+ bookings'],
      range: [0.4, 5.6],
      gridcolor: 'rgba(128,128,128,0.1)',
      zeroline: false,
      color: isDark ? '#6B6B70' : '#9ca3af',
    },
    yaxis: {
      title: 'Lifetime value ($)',
      gridcolor: 'rgba(128,128,128,0.1)',
      zeroline: false,
      tickprefix: '$',
      color: isDark ? '#6B6B70' : '#9ca3af',
    },
    legend: {
      x: 0,
      y: 1,
      bgcolor: 'transparent',
      font: { color: isDark ? '#AEAEB2' : '#6b7280' },
    },
    hovermode: 'closest',
    dragmode: 'zoom',
  }), [isDark])

  const config = {
    responsive: true,
    scrollZoom: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
    modeBarButtonsToAdd: [],
    toImageButtonOptions: {
      format: 'png',
      filename: 'panda_customer_scatter',
      height: 800,
      width: 1400,
      scale: 2,
    },
    displaylogo: false,
  }

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
    setPage(1)
  }

  function fmtMoney(val) {
    if (val == null || val === 0) return '—'
    return '$' + Number(val).toLocaleString()
  }

  function fmtNum(val) {
    if (val == null || val === 0) return '—'
    return Number(val).toLocaleString()
  }

  function fmtDate(val) {
    if (!val) return '—'
    return new Date(val).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function SortArrow({ col }) {
    if (sortBy !== col) return null
    return <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const thBase = 'px-3 py-2 text-left text-xs text-gray-400 dark:text-[#6B6B70] uppercase tracking-wide font-medium whitespace-nowrap'
  const thSort = thBase + ' cursor-pointer select-none hover:text-gray-600 dark:hover:text-[#AEAEB2]'
  const td     = 'px-3 py-2 text-xs text-gray-700 dark:text-[#AEAEB2] whitespace-nowrap'

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#1C1C1E]">

      <SidePanel
        country={country}
        onCountryChange={setCountry}
        customerType={customerType}
        onSegmentChange={setCustomerType}
        dateRange={dateRange}
        onDateChange={setDateRange}
        percentile={percentile}
        rawPercentile={rawPercentile}
        onPercentileChange={setRawPercentile}
        repeatThreshold={repeatThreshold}
        rawRepeatThreshold={rawRepeatThreshold}
        onRepeatThresholdChange={setRawRepeatThreshold}
      />

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-[#2D2D2F] bg-white dark:bg-[#242426]">

          {/* Left: back + title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 dark:text-[#8E8E93] hover:text-gray-900 dark:hover:text-[#F2F2F7] flex items-center gap-1"
            >
              ← Back to dashboard
            </button>
            <span className="text-gray-300 dark:text-[#3A3A3C]">|</span>
            <h1 className="text-sm font-medium text-gray-900 dark:text-[#F2F2F7]">
              Customer LTV Analysis
            </h1>
          </div>

          {/* Center: filter dropdown */}
          <select
            value={dotFilter}
            onChange={e => {
              setDotFilter(e.target.value)
              setPage(1)
              setSearch('')
            }}
            className="text-xs border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-3 py-1.5 bg-white dark:bg-[#242426] text-gray-700 dark:text-[#F2F2F7] focus:outline-none mx-4"
          >
            <option value="all">All customers ({displayCustomers.length.toLocaleString()})</option>
            <option value="top">Top Customers — LTV over $1,000</option>
            <option value="frequent">Frequent — 6+ bookings</option>
            <option value="loyal">Loyal — 1+ year on platform</option>
            <option value="generous">Generous — tips over $100</option>
          </select>

          {/* Right: view toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-[#2D2D2F] overflow-hidden shrink-0">
            <button
              onClick={() => setView('scatter')}
              className={view === 'scatter'
                ? 'bg-gray-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] px-3 py-1.5 text-xs font-medium'
                : 'bg-white dark:bg-[#242426] text-gray-500 dark:text-[#8E8E93] px-3 py-1.5 text-xs'
              }
            >
              Scatter
            </button>
            <button
              onClick={() => setView('table')}
              className={view === 'table'
                ? 'bg-gray-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] px-3 py-1.5 text-xs font-medium'
                : 'bg-white dark:bg-[#242426] text-gray-500 dark:text-[#8E8E93] px-3 py-1.5 text-xs'
              }
            >
              Table
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col" style={{ minHeight: 0 }}>
          {isLoadingFromSupabase ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-gray-400 dark:text-[#6B6B70]">Loading...</p>
            </div>
          ) : !isReady ? (
            <div className="flex items-center justify-center flex-1">
              <p className="text-sm text-gray-400 dark:text-[#6B6B70]">No data available.</p>
            </div>
          ) : view === 'scatter' ? (
            <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
              <p className="text-xs text-gray-400 dark:text-[#6B6B70] mb-3">
                {scatterCustomers.length.toLocaleString()} dots shown
                {dotFilter === 'all'
                  ? ` · sampled from ${displayCustomers.length.toLocaleString()}`
                  : ''
                }
              </p>
              <div className="flex-1" style={{ minHeight: 0 }}>
                <Plot
                  data={traces}
                  layout={layout}
                  config={config}
                  style={{ width: '100%', height: '100%' }}
                  useResizeHandler
                />
              </div>
            </div>
          ) : (
            /* Table view */
            <div className="flex flex-col gap-3">

              {/* Search + export */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="flex-1 text-xs border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-3 py-1.5 bg-white dark:bg-[#242426] text-gray-700 dark:text-[#F2F2F7] placeholder-gray-400 dark:placeholder-[#6B6B70] focus:outline-none"
                />
                <button
                  onClick={() => exportToCSV(tableCustomers)}
                  className="text-xs border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-3 py-1.5 bg-white dark:bg-[#242426] text-gray-500 dark:text-[#8E8E93] hover:text-gray-800 dark:hover:text-[#F2F2F7] whitespace-nowrap"
                >
                  Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-[#2D2D2F]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-[#2D2D2F]">
                      <th className={thBase}>Name</th>
                      <th className={thBase}>Bucket</th>
                      <th className={thSort} onClick={() => handleSort('net')}>
                        LTV <SortArrow col="net" />
                      </th>
                      <th className={thSort} onClick={() => handleSort('gross')}>
                        Gross <SortArrow col="gross" />
                      </th>
                      <th className={thBase}>Refunded</th>
                      <th className={thSort} onClick={() => handleSort('bookingCount')}>
                        Bookings <SortArrow col="bookingCount" />
                      </th>
                      <th className={thSort} onClick={() => handleSort('tipTotal')}>
                        Tips <SortArrow col="tipTotal" />
                      </th>
                      <th className={thBase}>Segment</th>
                      <th className={thBase}>First Payment</th>
                      <th className={thBase}>Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c, i) => (
                      <tr
                        key={c.id || i}
                        className="border-t border-gray-100 dark:border-[#2D2D2F] bg-white dark:bg-[#242426] hover:bg-gray-50 dark:hover:bg-[#2D2D2F]"
                      >
                        <td className={td + ' text-gray-900 dark:text-[#F2F2F7] font-medium'}>
                          {c.name || 'Unidentified Customer'}
                        </td>
                        <td className={td}>{c.bucket || '—'}</td>
                        <td className={td}>{fmtMoney(c.net)}</td>
                        <td className={td}>{fmtMoney(c.gross)}</td>
                        <td className={td}>{fmtMoney(c.refunded)}</td>
                        <td className={td}>{fmtNum(c.bookingCount)}</td>
                        <td className={td}>{fmtMoney(c.tipTotal)}</td>
                        <td className={td}>
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              background: c.isSubscriber ? 'rgba(24,95,165,0.1)' : 'rgba(99,153,34,0.1)',
                              color: c.isSubscriber ? '#185FA5' : '#639922',
                            }}
                          >
                            {c.isSubscriber ? 'Subscriber' : 'Non-subscriber'}
                          </span>
                        </td>
                        <td className={td}>{fmtDate(c.firstPayment)}</td>
                        <td className={td}>{fmtDate(c.lastPayment)}</td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-3 py-8 text-center text-xs text-gray-400 dark:text-[#6B6B70]"
                        >
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-[#6B6B70]">
                  {tableCustomers.length.toLocaleString()} customers
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="text-xs text-gray-500 dark:text-[#8E8E93] disabled:opacity-30 hover:text-gray-900 dark:hover:text-[#F2F2F7]"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-gray-500 dark:text-[#8E8E93]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="text-xs text-gray-500 dark:text-[#8E8E93] disabled:opacity-30 hover:text-gray-900 dark:hover:text-[#F2F2F7]"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
