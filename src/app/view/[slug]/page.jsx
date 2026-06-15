'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { loadPublishedSnapshot } from '@/lib/supabaseService'
import { hydrateJoined } from '@/store/dashboardStore'
import { filterByDateRange } from '@/lib/analytics/filter'
import { computeKPIs, computeBucketStats } from '@/lib/analytics/metrics'
import { computeBookingOutcomes } from '@/lib/analytics/bookingOutcomes'
import CountryToggle from '@/components/dashboard/CountryToggle'
import KPIBooking from '@/components/dashboard/KPIBooking'
import KPIHealth from '@/components/dashboard/KPIHealth'
import BookingOutcomes from '@/components/dashboard/BookingOutcomes'
import BucketBarChart from '@/components/dashboard/BucketBarChart'
import LTVDonutChart from '@/components/dashboard/LTVDonutChart'
import AvgPercentileChart from '@/components/dashboard/AvgPercentileChart'
import ScatterPlot from '@/components/dashboard/ScatterPlot'
import BucketTable from '@/components/dashboard/BucketTable'
import HealthTable from '@/components/dashboard/HealthTable'

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'sub', label: 'Subscribers' },
  { id: 'non', label: 'Non-subscribers' },
]

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-gray-100 my-6" />
}

function formatPublishedDate(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function ViewSlugPage() {
  const { slug } = useParams()

  // ── Data state ───────────────────────────────────────────────────────────────
  const [canadaJoined, setCanadaJoined]   = useState([])
  const [usJoined, setUsJoined]           = useState([])
  const [canadaMeta, setCanadaMeta]       = useState(null)
  const [usMeta, setUsMeta]               = useState(null)
  const [canadaPayments, setCanadaPayments] = useState([])
  const [usPayments, setUsPayments]       = useState([])
  const [publishedAt, setPublishedAt]     = useState(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [error, setError]                 = useState(null)

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [country, setCountry]                   = useState('us')
  const [dateRange, setDateRange]               = useState(90)
  const [customerType, setCustomerType]         = useState('all')
  const [percentile, setPercentile]             = useState(50)
  const [rawPercentile, setRawPercentile]       = useState(50)
  const [repeatThreshold, setRepeatThreshold]   = useState(2)
  const [rawRepeatThreshold, setRawRepeatThreshold] = useState(2)
  const [isComputing, setIsComputing]           = useState(false)

  const isMounted = useRef(false)

  // ── Debounce sliders ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setIsComputing(true)
    const timer = setTimeout(() => {
      setPercentile(rawPercentile)
      setRepeatThreshold(rawRepeatThreshold)
      setIsComputing(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [rawPercentile, rawRepeatThreshold])

  // ── Load from Supabase on mount ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const snap = await loadPublishedSnapshot(slug)
        if (!snap) {
          setError('not_found')
          return
        }

        const cJoined = hydrateJoined(snap.canada_data)
        const uJoined = hydrateJoined(snap.us_data)

        const cPayments = snap.canada_meta?.latest_payment_date
          ? [{ createdAt: new Date(snap.canada_meta.latest_payment_date) }]
          : []
        const uPayments = snap.us_meta?.latest_payment_date
          ? [{ createdAt: new Date(snap.us_meta.latest_payment_date) }]
          : []

        setCanadaJoined(cJoined)
        setUsJoined(uJoined)
        setCanadaMeta(snap.canada_meta)
        setUsMeta(snap.us_meta)
        setCanadaPayments(cPayments)
        setUsPayments(uPayments)
        setPublishedAt(snap.created_at)

        // Default to US if us_data exists, otherwise canada
        setCountry(uJoined.length > 0 ? 'us' : 'canada')
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [slug])

  // ── Select active country data ───────────────────────────────────────────────
  const joined   = country === 'canada' ? canadaJoined : usJoined
  const payments = country === 'canada' ? canadaPayments : usPayments

  // ── Computations ─────────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(() =>
    filterByDateRange(joined, payments, dateRange),
    [joined, payments, dateRange]
  )

  const filteredSubs = useMemo(() =>
    filteredCustomers.filter(c => c.isSubscriber),
    [filteredCustomers]
  )

  const filteredNonSubs = useMemo(() =>
    filteredCustomers.filter(c => !c.isSubscriber),
    [filteredCustomers]
  )

  const viewCustomers = useMemo(() => {
    if (customerType === 'sub') return filteredSubs
    if (customerType === 'non') return filteredNonSubs
    return filteredCustomers
  }, [filteredCustomers, filteredSubs, filteredNonSubs, customerType])

  const kpis = useMemo(() =>
    computeKPIs(viewCustomers, percentile, repeatThreshold),
    [viewCustomers, percentile, repeatThreshold]
  )

  const bucketStats = useMemo(() =>
    computeBucketStats(viewCustomers, percentile),
    [viewCustomers, percentile]
  )

  const bookingOutcomes = useMemo(() =>
    computeBookingOutcomes(viewCustomers),
    [viewCustomers]
  )

  const allBucketStats = useMemo(() =>
    computeBucketStats(filteredCustomers, percentile),
    [filteredCustomers, percentile]
  )

  const subBucketStats = useMemo(() =>
    computeBucketStats(filteredSubs, percentile),
    [filteredSubs, percentile]
  )

  const nonBucketStats = useMemo(() =>
    computeBucketStats(filteredNonSubs, percentile),
    [filteredNonSubs, percentile]
  )

  const repeatBadge = rawRepeatThreshold === 1 ? '1+ booking' : `${rawRepeatThreshold}+ bookings`

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ── Error / not-found state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M6 18L18 6" />
          </svg>
          <h1 className="text-lg font-medium text-gray-700 mb-2">This link is not valid</h1>
          <p className="text-sm text-gray-400">
            The dashboard link you followed does not exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  const hasData = joined.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <h1 className="text-base font-medium text-gray-900">
              Booking Frequency Dashboard
            </h1>
            {publishedAt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Published {formatPublishedDate(publishedAt)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isComputing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Updating...</span>
            </div>

            <select
              value={dateRange}
              onChange={e => setDateRange(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 12 months</option>
              <option value={0}>All time</option>
            </select>

            <CountryToggle country={country} onChange={setCountry} />
          </div>
        </div>

        {hasData && (
          <p className="text-xs text-gray-400 mb-8">
            {kpis.totalCustomers.toLocaleString()} customers
            {dateRange > 0 ? ` · Last ${dateRange} days` : ' · All time'}
          </p>
        )}

        {/* ── Empty state for selected country ────────────────────────────── */}
        {!hasData ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-gray-400">No data for {country === 'canada' ? 'Canada' : 'United States'}.</p>
          </div>
        ) : (
          <>
            {/* Sliders */}
            <div className="flex flex-col gap-2 mb-8">
              <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-3">
                <span className="text-xs font-medium text-gray-500 w-40 shrink-0">Percentile metric</span>
                <input
                  type="range" min={1} max={99} step={1} defaultValue={50}
                  onChange={e => setRawPercentile(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-md px-2.5 py-1 shrink-0 w-12 text-center tabular-nums">
                  P{rawPercentile}
                </span>
              </div>

              <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-5 py-3">
                <span className="text-xs font-medium text-gray-500 w-40 shrink-0">Repeat rate threshold</span>
                <input
                  type="range" min={1} max={5} step={1} defaultValue={2}
                  onChange={e => setRawRepeatThreshold(Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-md px-2.5 py-1 shrink-0 w-24 text-center tabular-nums">
                  {repeatBadge}
                </span>
              </div>
            </div>

            {/* Customer type toggle */}
            <div className="flex gap-1 mb-8">
              {TYPE_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setCustomerType(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    customerType === t.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Charts area */}
            <div className={`transition-opacity duration-150 ${isComputing ? 'opacity-60' : 'opacity-100'}`}>

              <SectionLabel>Booking metrics</SectionLabel>
              <div className="mb-8">
                <KPIBooking kpis={kpis} dateRange={dateRange} percentile={percentile} repeatThreshold={repeatThreshold} />
              </div>

              <SectionLabel>Business health</SectionLabel>
              <div className="mb-6">
                <KPIHealth kpis={kpis} />
              </div>

              <Divider />

              <SectionLabel>Booking outcomes</SectionLabel>
              <div className="mb-6">
                <BookingOutcomes outcomes={bookingOutcomes} />
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <BucketBarChart bucketStats={bucketStats} />
                <LTVDonutChart bucketStats={bucketStats} />
              </div>

              <div className="mb-4">
                <ScatterPlot
                  joinedCustomers={filteredCustomers}
                  customerType={customerType}
                  percentile={percentile}
                  rawPercentile={rawPercentile}
                />
              </div>

              <div className="mb-4">
                <AvgPercentileChart
                  allBucketStats={allBucketStats}
                  subBucketStats={subBucketStats}
                  nonBucketStats={nonBucketStats}
                  percentile={percentile}
                />
              </div>

              <div className="mb-4">
                <BucketTable
                  allBucketStats={allBucketStats}
                  subBucketStats={subBucketStats}
                  nonBucketStats={nonBucketStats}
                  percentile={percentile}
                />
              </div>

              <HealthTable allBucketStats={allBucketStats} />

            </div>
          </>
        )}

      </div>
    </div>
  )
}
