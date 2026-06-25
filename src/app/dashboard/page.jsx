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

function relativeTime(isoString) {
  if (!isoString) return null
  const diff  = Date.now() - new Date(isoString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 60) return mins + ' minutes ago'
  if (hours < 24) return hours + ' hours ago'
  return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { isPublishing, publishedSlug, publishDashboard } = useDashboardStore()
  const [copied, setCopied] = useState(false)
  const [dotFilter, setDotFilter] = useState('all')

  const {
    country, setCountry,
    isReady,
    isLoadingFromSupabase,
    supabaseError, setSupabaseError,
    uploadedAt,
    paymentsCount,
    subscriberCount,
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
    router.push('/admin/preview')
  }

  async function handleCopy() {
    if (!publishedSlug) return
    await copyToClipboard(window.location.origin + '/view/' + publishedSlug)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoadingFromSupabase) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-[#8E8E93]">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-[#8E8E93] mb-1">No data uploaded yet.</p>
          <p className="text-xs text-gray-400 dark:text-[#6B6B70] mb-4">Visit the admin panel to upload data.</p>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to upload
          </button>
        </div>
      </div>
    )
  }

  const updatedLabel = relativeTime(uploadedAt)

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

        {/* Status banner */}
        <div className={`border-b px-6 py-2 text-xs flex items-center justify-between ${publishedSlug ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {publishedSlug
            ? <span>This dashboard is live. Your team can view it.</span>
            : <span>This is your private preview. Your team cannot see this yet.</span>
          }
          <div className="flex items-center gap-2">
            {isPublishing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
                Publishing...
              </span>
            ) : publishedSlug ? (
              <>
                <span>✓ Published</span>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 rounded-md bg-green-700 text-green-50 hover:bg-green-800 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                className="px-3 py-1 rounded-md bg-amber-700 text-amber-50 hover:bg-amber-800 transition-colors font-medium"
              >
                Publish &amp; Get Link →
              </button>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* Supabase error banner */}
          {supabaseError && (
            <div className="flex items-start justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-amber-700">
                Could not connect to database. Showing locally loaded data.
              </p>
              <button
                onClick={() => setSupabaseError(null)}
                className="text-xs text-amber-600 hover:text-amber-800 shrink-0 underline"
              >
                Dismiss
              </button>
            </div>
          )}

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

              {updatedLabel && (
                <span className="text-xs text-gray-400 dark:text-[#6B6B70] whitespace-nowrap">
                  Updated {updatedLabel}
                </span>
              )}

              <button
                onClick={() => router.push('/admin')}
                className="text-xs border border-gray-200 dark:border-[#2D2D2F] rounded-lg px-3 py-1.5 bg-white dark:bg-[#242426] text-gray-700 dark:text-[#F2F2F7] hover:bg-gray-50 dark:hover:bg-[#2D2D2F] transition-colors"
              >
                Upload new
              </button>
            </div>
          </div>

          {/* Data summary line */}
          <p className="text-xs text-gray-400 dark:text-[#6B6B70] mb-8">
            {kpis.totalCustomers.toLocaleString()} {getCustomerLabel(customerType, kpis.totalCustomers)}
            {paymentsCount > 0 ? ` · ${paymentsCount.toLocaleString()} payments` : ''}
            {customerType === 'all' && subscriberCount > 0 ? ` · ${subscriberCount.toLocaleString()} subscribers` : ''}
            {` · ${getFilterLabel(dateRange)}`}
          </p>

          {/* Charts area dims while recomputing */}
          <div className={`transition-opacity duration-150 ${isComputing ? 'opacity-60' : 'opacity-100'}`}>

            <SectionLabel>
              {customerType === 'sub' ? 'Mean across subscribers'
                : customerType === 'non' ? 'Mean across non-subscribers'
                : 'Mean across segments'}
            </SectionLabel>
            <div className="mb-8">
              <KPIBooking
                kpis={kpis}
                dateRange={dateRange}
                percentile={percentile}
                repeatThreshold={repeatThreshold}
                customerType={customerType}
              />
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
      </div>
    </div>
  )
}