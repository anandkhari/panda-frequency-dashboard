'use client'

import { useMemo } from 'react'
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
import { BUCKETS } from '@/lib/analytics/constants'

const TOTAL_DOT_LIMIT = 800

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
  // Only keep customers with valid known buckets
  const bucketable = customers.filter(
    c => c.bucket != null && BUCKET_INDEX[c.bucket] !== undefined
  )
  const subs    = bucketable.filter(c =>  c.isSubscriber)
  const nonSubs = bucketable.filter(c => !c.isSubscriber)
  const nonSubLimit = TOTAL_DOT_LIMIT - subs.length
  let sampledNonSubs = nonSubs
  if (nonSubs.length > nonSubLimit) {
    const step = Math.ceil(nonSubs.length / nonSubLimit)
    sampledNonSubs = nonSubs.filter((_, i) => i % step === 0)
  }
  return [...subs, ...sampledNonSubs]
}

// Single combined dots array — fixes tooltip ambiguity
function buildAllDots(customers) {
  const dots = []
  customers.forEach((c) => {
    const bi = getBucketIndex(c.bucket)
    if (bi < 0) return
    const yPos = c.net ?? c.netVolume ?? 0
    if (yPos <= 0) return
    const seed = stableIndex(c.id)
    dots.push({
      x: bi + 1 + jitter(seed, bi * 1000),
      y: yPos,
      bucketIndex: bi,
      name: c.name || 'Unidentified Customer',
      bucket: c.bucket,
      // Store segment as string for tooltip display
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

// Single custom shape that draws circle or triangle
// based on isSubscriber field on each dot
function CustomDot(props) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null

  if (payload.isSubscriber) {
    // Blue circle for subscribers
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill="rgba(24,95,165,0.45)"
        stroke="rgba(24,95,165,0.7)"
        strokeWidth={0.5}
      />
    )
  }

  // Green triangle for non-subscribers
  const s = 6
  const pts = [
    `${cx},${cy - s}`,
    `${cx - s},${cy + s}`,
    `${cx + s},${cy + s}`,
  ].join(' ')
  return (
    <polygon
      points={pts}
      fill="rgba(99,153,34,0.45)"
      stroke="rgba(99,153,34,0.7)"
      strokeWidth={0.5}
    />
  )
}

// Tooltip now receives exactly one payload item
// because there is only one Scatter series
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  // Find the scatter dot payload
  // (exclude line reference points which have no segment)
  const point = payload.find(p => p.payload?.segment !== undefined)
  if (!point) return null

  const d = point.payload

  const bookingLabel = d.bookingCount != null
    ? `${d.bookingCount} booking${d.bookingCount === 1 ? '' : 's'}`
    : d.bucket || '—'

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm px-3 py-2">
      <p className="text-xs font-medium text-gray-900">
        {d.name}
      </p>
      <p className="text-xs mt-0.5"
        style={{ color: d.isSubscriber ? '#185FA5' : '#639922' }}>
        {d.segment}
      </p>
      <p className="text-xs text-gray-700 mt-0.5">
        ${Math.round(d.y).toLocaleString()} LTV
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
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
  const sampledCustomers = useMemo(
    () => sampleCustomers(joinedCustomers),
    [joinedCustomers],
  )

  // Single combined dots array
  const allDots = useMemo(() => {
    let customers = sampledCustomers
    if (customerType === 'sub')
      customers = sampledCustomers.filter(c => c.isSubscriber)
    else if (customerType === 'non')
      customers = sampledCustomers.filter(c => !c.isSubscriber)
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
      <div className="bg-white border border-gray-100 rounded-xl p-4 mb-3">
        <p className="text-xs text-gray-400">
          No customers in selected date range.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-3">
      <div className="text-sm font-medium text-gray-900 mb-0.5">
        Individual customer LTV — all buckets
      </div>
      <div className="text-xs text-gray-400 mb-4">
        Each dot = one customer · x-axis jittered within bucket ·
        color = segment · lines = avg &amp; P{rawPercentile}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-gray-500">
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
            stroke="rgba(128,128,128,0.07)"
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="x"
            domain={[0.4, 5.6]}
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={v => X_LABELS[v] || ''}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'booking bucket',
              position: 'insideBottom',
              offset: -10,
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, maxY]}
            tickFormatter={v => '$' + v.toLocaleString()}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            label={{
              value: 'lifetime value',
              angle: -90,
              position: 'insideLeft',
              fontSize: 10,
              fill: '#9ca3af',
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />

          {/* Single scatter series — shape function handles circle vs triangle */}
          <Scatter
            data={allDots}
            shape={<CustomDot />}
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