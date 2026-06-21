'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTheme } from 'next-themes'
import { BUCKETS } from '@/lib/analytics/constants'
import { getCustomerLabel } from '@/lib/customerLabel'

// Increased slightly for better density without killing performance
const TOTAL_DOT_LIMIT = 1000

const BUCKET_INDEX = {
  '1 booking':   0,
  '2 bookings':  1,
  '3 bookings':  2,
  '4 bookings':  3,
  '5+ bookings': 4,
}

const X_LABELS = {
  1: '1 booking',
  2: '2 bookings',
  3: '3 bookings',
  4: '4 bookings',
  5: '5+ bookings',
}

function getBucketIndex(bucket) {
  if (bucket == null) return -1
  const idx = BUCKET_INDEX[bucket]
  return idx !== undefined ? idx : -1
}

function jitter(seed, offset) {
  const x = Math.sin(seed + offset) * 10000
  const frac = x - Math.floor(x)
  return (frac - 0.5) * 0.28
}

function stableIndex(id) {
  let h = 0
  const s = String(id)
  for (let i = 0; i < s.length; i++)
    h = Math.abs(((h << 5) - h) + s.charCodeAt(i)) | 0
  return h
}

function computePercentile(arr, p) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return lo === hi
    ? sorted[lo]
    : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function sampleCustomers(customers) {
  // Sort descending by LTV so we never lose the top spenders during sampling
  const sorted = [...customers].sort((a, b) => {
    const yA = a.net ?? a.netVolume ?? 0
    const yB = b.net ?? b.netVolume ?? 0
    return yB - yA
  })

  const bucketable = sorted.filter(
    c => c.bucket != null && BUCKET_INDEX[c.bucket] !== undefined
  )
  
  // Take the absolute top TOTAL_DOT_LIMIT across the board
  return bucketable.slice(0, TOTAL_DOT_LIMIT)
}

function buildAllDots(customers) {
  const dots = []
  customers.forEach((c) => {
    const bi = getBucketIndex(c.bucket)
    if (bi < 0) return
    const yPos = c.net ?? c.netVolume ?? 0
    if (yPos <= 0) return
    
    // FIX 1: Provide a random fallback string if the customer ID is missing 
    // so Unidentified Customers don't share the same seed.
    const safeId = c.id || `unidentified-${Math.random().toString()}`
    const seed = stableIndex(safeId)

    // FIX 2: Multiply the X jitter to spread them out a bit wider horizontally
    // (Original was max +/- 0.14, this makes it +/- 0.35)
    const xOffset = jitter(seed, bi * 1000) * 2.5

    // FIX 3: Add Y-axis jitter. We multiply by 50 to shift the dot randomly 
    // up or down by about +/- $14. This breaks the flat-line visual illusion!
    const yOffset = jitter(seed, bi * 2000) * 50 

    dots.push({
      id: safeId, // Use the safe ID for React keys
      x: bi + 1 + xOffset,
      y: yPos + yOffset,  // Apply the vertical jitter
      bucketIndex: bi,
      name: c.name || 'Unidentified Customer',
      bucket: c.bucket,
      segment: c.isSubscriber ? 'Subscriber' : 'Non-subscriber',
      isSubscriber: c.isSubscriber,
      bookingCount: c.bookingCount ?? c.paymentCount ?? null,
      isUnidentified: c.isUnidentified ?? false,
    })
  })
  return dots
}

function buildReferenceLines(customers, percentile) {
  const avgLineData        = []
  const percentileLineData = []

  BUCKETS.forEach((bucket, bi) => {
    const ltvs = customers
      .filter(c => c.bucket === bucket)
      .map(c => c.net ?? c.netVolume ?? 0)
      .filter(v => v > 0)

    const avgVal = ltvs.length
      ? ltvs.reduce((a, b) => a + b, 0) / ltvs.length
      : 0
    const pVal = computePercentile(ltvs, percentile)

    avgLineData.push(
      { x: bi + 0.62, y: Math.round(avgVal) },
      { x: bi + 1.38, y: Math.round(avgVal) },
      { x: null,      y: null },
    )
    percentileLineData.push(
      { x: bi + 0.62, y: Math.round(pVal) },
      { x: bi + 1.38, y: Math.round(pVal) },
      { x: null,      y: null },
    )
  })

  return { avgLineData, percentileLineData }
}

function CustomDot(props) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null

  if (payload.isSubscriber) {
    return (
      <circle
        key={`sub-${payload.id}`} // Enforce stable keys
        cx={cx}
        cy={cy}
        r={3.5}
        fill="rgba(24,95,165,0.45)"
        stroke="rgba(24,95,165,0.7)"
        strokeWidth={0.5}
        style={{ transition: 'all 0.3s ease-out' }} // Smooth coordinate changes
      />
    )
  }

  const s = 6
  const pts = [
    `${cx},${cy - s}`,
    `${cx - s},${cy + s}`,
    `${cx + s},${cy + s}`,
  ].join(' ')
  return (
    <polygon
      key={`non-${payload.id}`} // Enforce stable keys
      points={pts}
      fill="rgba(99,153,34,0.45)"
      stroke="rgba(99,153,34,0.7)"
      strokeWidth={0.5}
      style={{ transition: 'all 0.3s ease-out' }} // Smooth coordinate changes
    />
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const point = payload.find(p => p.payload?.segment !== undefined)
  if (!point) return null

  const d = point.payload

  const bookingLabel = d.bookingCount != null
    ? `${d.bookingCount} booking${d.bookingCount === 1 ? '' : 's'}`
    : d.bucket || '—'

  return (
    <div className="bg-white dark:bg-[#2D2D2F] border border-gray-100 dark:border-[#3A3A3C] rounded-lg shadow-sm px-3 py-2">
      <p className="text-xs font-medium text-gray-900 dark:text-[#F2F2F7]">
        {d.name}
      </p>
      <p className="text-xs mt-0.5"
        style={{ color: d.isSubscriber ? '#185FA5' : '#639922' }}>
        {d.segment}
      </p>
      <p className="text-xs text-gray-700 dark:text-[#AEAEB2] mt-0.5">
        ${Math.round(d.y).toLocaleString()} LTV
      </p>
      <p className="text-xs text-gray-400 dark:text-[#6B6B70] mt-0.5">
        {bookingLabel}
      </p>
    </div>
  )
}

export default function ScatterPlot({
  joinedCustomers,
  customerType,
  percentile,
  rawPercentile,
}) {
  const router = useRouter()

  console.log("🔥 SCATTER DATA INBOUND:", joinedCustomers.length, "customers | Type:", customerType);

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? 'rgba(128,128,128,0.07)' : 'rgba(128,128,128,0.07)'
  const tickColor = isDark ? '#6B6B70' : '#9ca3af'

  const sampledCustomers = useMemo(
    () => sampleCustomers(joinedCustomers),
    [joinedCustomers],
  )

  const allDots = useMemo(() => {
    let customers = sampledCustomers
    if (customerType === 'sub')
      customers = sampledCustomers.filter(c => c.isSubscriber)
    else if (customerType === 'non')
      customers = sampledCustomers.filter(c => !c.isSubscriber)

    console.log(`🎯 FILTERED DOTS TO DRAW (${customerType}):`, customers.length);

    return buildAllDots(customers)
  }, [sampledCustomers, customerType])

  const { avgLineData, percentileLineData } = useMemo(() => {
    let ref = joinedCustomers.filter(
      c => c.bucket != null && BUCKET_INDEX[c.bucket] !== undefined
    )
    if (customerType === 'sub')
      ref = ref.filter(c => c.isSubscriber)
    else if (customerType === 'non')
      ref = ref.filter(c => !c.isSubscriber)
    return buildReferenceLines(ref, percentile)
  }, [joinedCustomers, percentile, customerType])

  const maxY = useMemo(() => {
    const allY = allDots.map(d => d.y)
    return allY.length ? Math.round(Math.max(...allY) * 1.08) : 1000
  }, [allDots])

  if (!joinedCustomers.length) {
    return (
      <div className="bg-white dark:bg-[#242426] border border-gray-100 dark:border-[#2D2D2F] rounded-xl p-4 mb-3">
        <p className="text-xs text-gray-400 dark:text-[#6B6B70]">
          No customers in selected date range.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#242426] border border-gray-100 dark:border-[#2D2D2F] rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-[#F2F2F7]">
            Individual {getCustomerLabel(customerType, 1)} LTV — all buckets
          </span>

          {/* Info icon with tooltip */}
          <div className="relative group">
            <svg
              className="w-3.5 h-3.5 text-gray-400 dark:text-[#6B6B70] cursor-help"
              fill="none" viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2"/>
              <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01"/>
            </svg>

            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
              <div className="bg-gray-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] text-[11px] rounded-lg px-3 py-2 text-center leading-relaxed shadow-lg">
                Showing a representative sample of 1,000 dots. Click Expand for the full dataset with filters.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-[#F2F2F7]"></div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/scatter')}
          className="text-xs text-gray-400 dark:text-[#6B6B70] hover:text-gray-700 dark:hover:text-[#F2F2F7] flex items-center gap-1 border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-2 py-1 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
          Expand
        </button>
      </div>
      <div className="text-xs text-gray-400 dark:text-[#6B6B70] mb-4">
        Each dot = one {getCustomerLabel(customerType, 1)} · x-axis jittered within bucket ·
        color = segment · lines = avg &amp; P{rawPercentile}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500 dark:text-[#8E8E93]">
        {(customerType === 'all' || customerType === 'sub') && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: 'rgba(24,95,165,0.5)' }}
            />
            Subscriber
          </span>
        )}
        {(customerType === 'all' || customerType === 'non') && (
          <span className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" className="shrink-0">
              <polygon points="5,0 0,10 10,10" fill="rgba(99,153,34,0.5)" />
            </svg>
            Non-subscriber
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 shrink-0 bg-[#D85A30]" />
          Avg LTV
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-5 shrink-0"
            style={{
              background:
                'repeating-linear-gradient(90deg,#7F77DD 0,#7F77DD 5px,transparent 5px,transparent 9px)',
            }}
          />
          P{rawPercentile} LTV
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
          <CartesianGrid
            strokeDasharray=""
            stroke={gridColor}
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0.4, 5.6]}
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={v => X_LABELS[v] || ''}
            tick={{ fontSize: 10, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'booking bucket',
              position: 'insideBottom',
              offset: -10,
              fontSize: 10,
              fill: tickColor,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, maxY]}
            tickFormatter={v => '$' + v.toLocaleString()}
            tick={{ fontSize: 10, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'lifetime value',
              angle: -90,
              position: 'insideLeft',
              fontSize: 10,
              fill: tickColor,
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />

          <Scatter
            data={allDots}
            shape={<CustomDot />}
            isAnimationActive={false} // Crucial: Recharts animation clashes with React keys
          />

          <Line
            data={avgLineData}
            type="linear"
            dataKey="y"
            stroke="#D85A30"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            legendType="none"
            connectNulls={false}
            isAnimationActive={false}
            style={{ pointerEvents: 'none' }}
          />

          <Line
            data={percentileLineData}
            type="linear"
            dataKey="y"
            stroke="#7F77DD"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            legendType="none"
            connectNulls={false}
            isAnimationActive={false}
            style={{ pointerEvents: 'none' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}