'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboardStore'
import { copyToClipboard } from '@/lib/copyToClipboard'
import { getFilterLabel } from '@/lib/analytics/filter'
import { getCustomerLabel } from '@/lib/customerLabel'
import SidePanel from '@/components/dashboard/SidePanel'
import KPIBooking from '@/components/dashboard/KPIBooking'
import KPITips from '@/components/dashboard/KPITips'
import KPIReturnIntervals from '@/components/dashboard/KPIReturnIntervals'
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
    <p className="text-xs font-medium text-gray-400 dark:text-[#6B6B70] uppercase tracking-wide mb-3">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-gray-100 dark:border-[#2D2D2F] my-6" />
}

export default function AdminPreviewPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { isPublishing, publishedSlug, publishDashboard } = useDashboardStore()

  const [copied, setCopied] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerTimer, setBannerTimer] = useState(null)
  const [dotFilter, setDotFilter] = useState('all')

  const {
    country, setCountry,
    isReady,
    isLoadingFromSupabase,
    availableYears,
    dateRange, setDateRange,
    customerType, setCustomerType,
    rawPercentile, setRawPercentile,
    rawRepeatThreshold, setRawRepeatThreshold,
    percentile, repeatThreshold,
    isComputing,
    filteredCustomers,
    kpis,
    bucketStats,
    bookingOutcomes,
    allBucketStats,
    subBucketStats,
    nonBucketStats,
    tipStats,
    returnIntervals,
  } = useDashboard()

  async function handlePublish() {
    await publishDashboard()
    setShowBanner(true)
    if (bannerTimer) clearTimeout(bannerTimer)
    const t = setTimeout(() => setShowBanner(false), 10000)
    setBannerTimer(t)
  }

  async function handleCopy() {
    if (!publishedSlug) return
    await copyToClipboard(window.location.origin + '/view/' + publishedSlug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const repeatBadge = rawRepeatThreshold === 1 ? '1+ booking' : `${rawRepeatThreshold}+ bookings`

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
        /* ADDED: Missing props required by the new SidePanel */
        percentile={percentile}
        rawPercentile={rawPercentile}
        onPercentileChange={setRawPercentile}
        repeatThreshold={repeatThreshold}
        rawRepeatThreshold={rawRepeatThreshold}
        onRepeatThresholdChange={setRawRepeatThreshold}
      />

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#242426] border-b border-gray-200 dark:border-[#2D2D2F] h-12 px-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-600 dark:text-[#8E8E93] hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="flex items-center gap-1.5">
          {publishedSlug ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="text-xs text-gray-500 dark:text-[#8E8E93]">Published</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-xs text-amber-600">Preview — not yet published</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPublishing ? (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              Publishing...
            </span>
          ) : publishedSlug ? (
            <>
              <span className="text-xs text-green-600 font-medium">✓ Published</span>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </>
          ) : (
            <button
              onClick={handlePublish}
              className="text-xs px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors"
            >
              Publish & Get Link →
            </button>
          )}
        </div>
      </div>

      {/* ── Success banner ─────────────────────────────────────────────────── */}
      {showBanner && publishedSlug && (
        <div className="fixed top-12 left-0 right-0 z-40 bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-800">✓ Published successfully</p>
              <p className="text-xs text-green-700 mt-0.5">Share this link with your team:</p>
              <p className="text-xs font-mono text-green-800 mt-0.5">
                {typeof window !== 'undefined' ? window.location.origin : ''}/view/{publishedSlug}
              </p>
              <p className="text-xs text-green-600 mt-1">
                This link is permanent and always shows this exact snapshot of data.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => setShowBanner(false)}
                className="text-green-600 hover:text-green-800 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dashboard content ──────────────────────────────────────────────── */}
      <div className="flex-1 md:ml-64 overflow-y-auto" style={{ paddingTop: 56 }}>
        {isLoadingFromSupabase ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading dashboard data...</p>
            </div>
          </div>
        ) : !isReady ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">No data uploaded yet.</p>
              <p className="text-xs text-gray-400">Go back and upload CSV files first.</p>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-6 py-8">

            {/* Top bar */}
            <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#F2F2F7] tracking-tight">
                  PANDA FREQUENCY DASHBOARD
                </h1>
                <p className="text-sm text-gray-400 dark:text-[#6B6B70] mt-1">
                  Panda Hub · customer cohort analysis
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isComputing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400 dark:text-[#6B6B70]">Updating...</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-[#6B6B70] mb-8">
              {kpis.totalCustomers.toLocaleString()} {getCustomerLabel(customerType, kpis.totalCustomers)}
              {` · ${getFilterLabel(dateRange)}`}
            </p>

            {/* DELETED: Old SliderControl block that was duplicating the sliders in the sidebar */}

            {/* Charts area */}
            <div className={`transition-opacity duration-150 ${isComputing ? 'opacity-60' : 'opacity-100'}`}>

              <SectionLabel>Booking metrics</SectionLabel>
              <div className="mb-8">
                <KPIBooking kpis={kpis} dateRange={dateRange} percentile={percentile} repeatThreshold={repeatThreshold} customerType={customerType} />
              </div>

              <SectionLabel>Tip analysis</SectionLabel>
              <div className="mb-8">
                <KPITips
                  tipStats={tipStats}
                  customerType={customerType}
                />
              </div>

              <SectionLabel>Return intervals</SectionLabel>
              <div className="mb-8">
                <KPIReturnIntervals
                  returnIntervals={returnIntervals}
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-400 dark:text-[#6B6B70] uppercase tracking-wide">
                    Customer scatter
                  </p>
                  <select
                    value={dotFilter}
                    onChange={e => setDotFilter(e.target.value)}
                    className="text-xs border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-2 py-1.5 bg-white dark:bg-[#242426] text-gray-700 dark:text-[#F2F2F7] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All customers</option>
                    <option value="top">Top Customers (LTV over $1,000)</option>
                    <option value="loyal">Loyal Customers</option>
                    <option value="generous">Generous Customers</option>
                  </select>
                </div>
                <ScatterPlot
                  filteredCustomers={filteredCustomers}
                  customerType={customerType}
                  dotFilter={dotFilter}
                  isDark={isDark}
                  rawPercentile={rawPercentile}
                  percentile={percentile}
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
          </div>
        )}
      </div>

    </div>
  )
}