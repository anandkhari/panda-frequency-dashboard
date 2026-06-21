'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { loadPublishedSnapshot } from '@/lib/supabaseService'
import { filterByDateRange } from '@/lib/analytics/filter'
import { computeKPIs, computeBucketStats, computeTipStats } from '@/lib/analytics/metrics' // NEW: imported computeTipStats
import { computeBookingOutcomes } from '@/lib/analytics/bookingOutcomes'
import { getFilterLabel } from '@/lib/analytics/filter'
import { getCustomerLabel } from '@/lib/customerLabel'
import SidePanel from '@/components/dashboard/SidePanel'
import KPIBooking from '@/components/dashboard/KPIBooking'
import KPITips from '@/components/dashboard/KPITips' // NEW: imported KPITips
import KPIHealth from '@/components/dashboard/KPIHealth'
import BookingOutcomes from '@/components/dashboard/BookingOutcomes'
import BucketBarChart from '@/components/dashboard/BucketBarChart'
import LTVDonutChart from '@/components/dashboard/LTVDonutChart'
import AvgPercentileChart from '@/components/dashboard/AvgPercentileChart'
import ScatterPlot from '@/components/dashboard/ScatterPlot'
import BucketTable from '@/components/dashboard/BucketTable'
import HealthTable from '@/components/dashboard/HealthTable'

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-medium text-gray-400 dark:text-[#6B6B70] uppercase tracking-wide mb-3">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-gray-100 dark:border-[#2D2D2F] my-6" />
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

        const cJoined = snap.canada_data || []
        const uJoined = snap.us_data || []

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

  const availableYears = useMemo(() => {
    const activeMeta = country === 'canada' ? canadaMeta : usMeta
    return activeMeta?.availableYears || []
  }, [country, canadaMeta, usMeta])

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

  // NEW: Compute tip stats for the shared page. 
  // viewCustomers already handles the customerType toggle and dateRange filtering!
  const tipStats = useMemo(() =>
    computeTipStats(viewCustomers),
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

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-[#8E8E93]">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ── Error / not-found state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <svg className="w-16 h-16 text-gray-300 dark:text-[#3A3A3C] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M6 18L18 6" />
          </svg>
          <h1 className="text-lg font-medium text-gray-700 dark:text-[#F2F2F7] mb-2">This link is not valid</h1>
          <p className="text-sm text-gray-400 dark:text-[#6B6B70]">
            The dashboard link you followed does not exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  const hasData = joined.length > 0

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#1C1C1E]">

      <SidePanel
        country={country}
        onCountryChange={setCountry}
        customerType={customerType}
        onSegmentChange={setCustomerType}
        dateRange={dateRange}
        onDateChange={setDateRange}
        availableYears={availableYears}
        percentile={percentile}
        rawPercentile={rawPercentile}
        onPercentileChange={setRawPercentile}
        repeatThreshold={repeatThreshold}
        rawRepeatThreshold={rawRepeatThreshold}
        onRepeatThresholdChange={setRawRepeatThreshold}
      />

      <div className="flex-1 md:ml-60 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
            <div>
              <h1 className="text-base font-medium text-gray-900 dark:text-[#F2F2F7]">
                PANDA FREQUENCY DASHBOARD
              </h1>
              {publishedAt && (
                <p className="text-xs text-gray-400 dark:text-[#6B6B70] mt-0.5">
                  Published {formatPublishedDate(publishedAt)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isComputing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 dark:text-[#6B6B70]">Updating...</span>
              </div>
            </div>
          </div>

          {hasData && (
            <p className="text-xs text-gray-400 dark:text-[#6B6B70] mb-8">
              {kpis.totalCustomers.toLocaleString()} {getCustomerLabel(customerType, kpis.totalCustomers)}
              {` · ${getFilterLabel(dateRange)}`}
            </p>
          )}

          {/* ── Empty state for selected country ────────────────────────────── */}
          {!hasData ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-gray-400 dark:text-[#6B6B70]">No data for {country === 'canada' ? 'Canada' : 'United States'}.</p>
            </div>
          ) : (
            <>
              <div className={`transition-opacity duration-150 ${isComputing ? 'opacity-60' : 'opacity-100'}`}>

                <SectionLabel>Booking metrics</SectionLabel>
                <div className="mb-8">
                  <KPIBooking kpis={kpis} dateRange={dateRange} percentile={percentile} repeatThreshold={repeatThreshold} customerType={customerType} />
                </div>

                {/* NEW: Tip analysis section added here */}
                <SectionLabel>Tip analysis</SectionLabel>
                <div className="mb-8">
                  <KPITips
                    tipStats={tipStats}
                    customerType={customerType}
                  />
                </div>

                <SectionLabel>Business health</SectionLabel>
                <div className="mb-6">
                  <KPIHealth kpis={kpis} customerType={customerType} />
                </div>

                <Divider />

                <SectionLabel>Booking outcomes</SectionLabel>
                <div className="mb-6">
                  <BookingOutcomes outcomes={bookingOutcomes} />
                </div>

                <Divider />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <BucketBarChart bucketStats={bucketStats} />
                  <LTVDonutChart bucketStats={bucketStats} totalLTV={kpis.totalLTV} />
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
                    bucketStats={
                      customerType === 'sub'
                        ? subBucketStats
                        : customerType === 'non'
                          ? nonBucketStats
                          : allBucketStats
                    }
                    percentile={percentile}
                    customerType={customerType}
                  />
                </div>

                <HealthTable allBucketStats={allBucketStats} />

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}