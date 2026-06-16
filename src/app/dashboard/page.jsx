'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboardStore'
import { copyToClipboard } from '@/lib/copyToClipboard'
import { getFilterLabel } from '@/components/dashboard/DateRangeFilter'
import SidePanel from '@/components/dashboard/SidePanel'
import KPIBooking from '@/components/dashboard/KPIBooking'
import KPIHealth from '@/components/dashboard/KPIHealth'
import BookingOutcomes from '@/components/dashboard/BookingOutcomes'
import BucketBarChart from '@/components/dashboard/BucketBarChart'
import LTVDonutChart from '@/components/dashboard/LTVDonutChart'
import AvgPercentileChart from '@/components/dashboard/AvgPercentileChart'
import ScatterPlot from '@/components/dashboard/ScatterPlot'
import BucketTable from '@/components/dashboard/BucketTable'
import HealthTable from '@/components/dashboard/HealthTable'
import SliderControl from '@/components/dashboard/SliderControl'

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
  const { isPublishing, publishedSlug, publishDashboard } = useDashboardStore()
  const [copied, setCopied] = useState(false)

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">No data uploaded yet.</p>
          <p className="text-xs text-gray-400 mb-4">Visit the admin panel to upload data.</p>
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

  const repeatBadge = rawRepeatThreshold === 1 ? '1+ booking' : `${rawRepeatThreshold}+ bookings`
  const updatedLabel = relativeTime(uploadedAt)

  return (
    <div className="flex min-h-screen bg-gray-50">

      <SidePanel
        country={country}
        onCountryChange={setCountry}
        customerType={customerType}
        onSegmentChange={setCustomerType}
        dateRange={dateRange}
        onDateChange={setDateRange}
        availableYears={availableYears}
      />

      <div className="flex-1 md:ml-60 overflow-y-auto">

        {/* Amber banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-700 flex items-center justify-between">
          <span>This is your private preview. Your team cannot see this yet.</span>
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
                  className="px-3 py-1 rounded-md bg-amber-700 text-amber-50 hover:bg-amber-800 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </>
            ) : (
              <button
                onClick={handlePublish}
                className="px-3 py-1 rounded-md bg-amber-700 text-amber-50 hover:bg-amber-800 transition-colors font-medium"
              >
                Publish & Get Link →
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
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                Booking frequency dashboard
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Panda Hub · customer cohort analysis
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${isComputing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Updating...</span>
              </div>

              {updatedLabel && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  Updated {updatedLabel}
                </span>
              )}

              <button
                onClick={() => router.push('/admin')}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Upload new
              </button>
            </div>
          </div>

          {/* Data summary line */}
          <p className="text-xs text-gray-400 mb-8">
            {kpis.totalCustomers.toLocaleString()} customers
            {paymentsCount > 0 ? ` · ${paymentsCount.toLocaleString()} payments` : ''}
            {subscriberCount > 0 ? ` · ${subscriberCount.toLocaleString()} subscribers` : ''}
            {` · ${getFilterLabel(dateRange)}`}
          </p>

          {/* Sliders */}
          <div className="flex flex-col gap-2 mb-8">
            <SliderControl
              label="Percentile metric"
              min={1} max={99} step={1}
              value={rawPercentile}
              onChange={setRawPercentile}
              color="blue"
              badge={
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 rounded-md px-2.5 py-1 shrink-0 w-12 text-center tabular-nums">
                  P{rawPercentile}
                </span>
              }
            />
            <SliderControl
              label="Repeat rate threshold"
              min={1} max={5} step={1}
              value={rawRepeatThreshold}
              onChange={setRawRepeatThreshold}
              color="green"
              badge={
                <span className="text-xs font-semibold bg-green-100 text-green-700 rounded-md px-2.5 py-1 shrink-0 w-24 text-center tabular-nums">
                  {repeatBadge}
                </span>
              }
            />
          </div>

          {/* Charts area dims while recomputing */}
          <div className={`transition-opacity duration-150 ${isComputing ? 'opacity-60' : 'opacity-100'}`}>

            <SectionLabel>Booking metrics</SectionLabel>
            <div className="mb-8">
              <KPIBooking
                kpis={kpis}
                dateRange={dateRange}
                percentile={percentile}
                repeatThreshold={repeatThreshold}
              />
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
