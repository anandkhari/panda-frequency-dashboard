'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'

const SLOTS = [
  { country: 'canada', type: 'payments',  label: 'Canada Payments CSV',  hint: 'Stripe payments export' },
  { country: 'canada', type: 'customers', label: 'Canada Customers CSV', hint: 'Stripe customers export' },
  { country: 'us',     type: 'payments',  label: 'US Payments CSV',      hint: 'Stripe payments export' },
  { country: 'us',     type: 'customers', label: 'US Customers CSV',     hint: 'Stripe customers export' },
]

function UploadBox({ country, type, label, hint, slot, onUpload }) {
  const inputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) onUpload(country, type, file)
  }, [country, type, onUpload])

  const handleChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file) onUpload(country, type, file)
    e.target.value = ''
  }, [country, type, onUpload])

  const isLoaded  = slot.isLoaded
  const isLoading = slot.isLoading
  const hasError  = !!slot.error

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={`
        relative rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all
        ${isLoaded              ? 'border-green-300 bg-green-50'                             : ''}
        ${hasError              ? 'border-red-300 bg-red-50'                                 : ''}
        ${!isLoaded && !hasError ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleChange}
      />

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</p>

      {isLoading && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Parsing...</span>
        </div>
      )}

      {!isLoading && isLoaded && (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs text-green-700 font-medium truncate">{slot.fileName}</span>
        </div>
      )}

      {!isLoading && hasError && (
        <p className="text-xs text-red-600">{slot.error}</p>
      )}

      {!isLoading && !isLoaded && !hasError && (
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-xs">{hint} · drop or click</span>
        </div>
      )}
    </div>
  )
}

function formatUploadedAt(isoString) {
  if (!isoString) return null
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function CountryStatus({ label, store }) {
  const hasData = store.isReady && store.uploadedAt
  const date    = formatUploadedAt(store.uploadedAt)

  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${hasData ? 'bg-green-500' : 'bg-gray-300'}`} />
      <div>
        <span className="text-xs font-medium text-gray-700">{label}</span>
        {hasData ? (
          <p className="text-xs text-gray-400 mt-0.5">
            Last updated {date} · {(store.customersCount ?? 0).toLocaleString()} customers · {(store.paymentsCount ?? 0).toLocaleString()} payments
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">No data uploaded yet</p>
        )}
      </div>
    </div>
  )
}

export default function UploadPanel({ onAllReady }) {
  const {
    canada,
    us,
    uploadFile,
    isSavingToSupabase,
    savingCountry,
    supabaseError,
    setSupabaseError,
  } = useDashboardStore()

  const [saveSuccess, setSaveSuccess] = useState(false)
  const successTimer = useRef(null)

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (isSavingToSupabase) {
      setSaveSuccess(false)
      clearTimeout(successTimer.current)
    }
  }, [isSavingToSupabase])

  // Detect transition from saving → not saving to show success banner
  const wasSaving = useRef(false)
  useEffect(() => {
    if (wasSaving.current && !isSavingToSupabase && !supabaseError) {
      setSaveSuccess(true)
      clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSaveSuccess(false), 5000)
    }
    wasSaving.current = isSavingToSupabase
  }, [isSavingToSupabase, supabaseError])

  const slots = {
    canada: { payments: canada.payments, customers: canada.customers },
    us:     { payments: us.payments,     customers: us.customers },
  }

  const loadedCount = SLOTS.filter(s => slots[s.country][s.type].isLoaded).length
  const allReady    = canada.isReady && us.isReady
  const isSaving    = isSavingToSupabase
  const savingLabel = savingCountry === 'canada' ? 'Canada' : 'US'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
            Booking frequency dashboard
          </h1>
          <p className="text-sm text-gray-400">
            Car detailing marketplace · customer cohort analysis
          </p>
        </div>

        {/* Existing data status */}
        <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 mb-6 flex flex-col gap-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current data</p>
          <CountryStatus label="Canada" store={canada} />
          <CountryStatus label="United States" store={us} />
        </div>

        {/* Upload boxes */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SLOTS.map(s => (
            <UploadBox
              key={`${s.country}-${s.type}`}
              {...s}
              slot={slots[s.country][s.type]}
              onUpload={uploadFile}
            />
          ))}
        </div>

        {/* Saving banner */}
        {isSaving && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-blue-700">
              Saving {savingLabel} data to database...
            </p>
          </div>
        )}

        {/* Success banner */}
        {saveSuccess && !isSaving && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-green-700">
              Data saved successfully. Dashboard is ready to share with your team.
            </p>
          </div>
        )}

        {/* Error banner */}
        {supabaseError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-red-700">
                Failed to save to database: {supabaseError}. Your data is loaded locally — you can
                view the dashboard but other users won&apos;t see this data until you re-upload.
              </p>
              <button
                onClick={() => setSupabaseError(null)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {loadedCount} of {SLOTS.length} files loaded
          </p>
          <button
            onClick={onAllReady}
            disabled={!allReady || isSaving}
            title={isSaving ? 'Please wait while data is being saved…' : ''}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-colors
              ${allReady && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isSaving ? 'Saving...' : 'View Dashboard'}
          </button>
        </div>

      </div>
    </div>
  )
}
