'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboard } from '@/hooks/useDashboard'
import { useDashboardStore } from '@/store/dashboardStore'
import { copyToClipboard } from '@/lib/copyToClipboard'
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

export default function AdminPreviewPage() {
  const router = useRouter()
  const { isPublishing, publishedSlug, publishDashboard } = useDashboardStore()

  const [copied, setCopied] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [bannerTimer, setBannerTimer] = useState(null)

  const {
    country, setCountry,
    isReady,
    isLoadingFromSupabase,
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
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-12 px-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          ← Back
        </button>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-xs text-amber-600">Preview — not yet published</span>
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
      <div style={{ paddingTop: 56 }}>
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

            <p className="text-xs text-gray-400 mb-8">
              {kpis.totalCustomers.toLocaleString()} customers
              {dateRange > 0 ? ` · Last ${dateRange} days` : ' · All time'}
            </p>

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
          </div>
        )}
      </div>

    </div>
  )
}
