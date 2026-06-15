'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardStore } from '@/store/dashboardStore'
import { copyToClipboard } from '@/lib/copyToClipboard'

// ── Upload slot definitions ────────────────────────────────────────────────────
const SLOTS = [
  { country: 'canada', type: 'payments',  label: 'Canada Payments CSV',  hint: 'Stripe payments export' },
  { country: 'canada', type: 'customers', label: 'Canada Customers CSV', hint: 'Stripe customers export' },
  { country: 'us',     type: 'payments',  label: 'US Payments CSV',      hint: 'Stripe payments export' },
  { country: 'us',     type: 'customers', label: 'US Customers CSV',     hint: 'Stripe customers export' },
]

// ── Upload box ─────────────────────────────────────────────────────────────────
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
        ${isLoaded               ? 'border-green-300 bg-green-50'                                      : ''}
        ${hasError               ? 'border-red-300 bg-red-50'                                          : ''}
        ${!isLoaded && !hasError ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'  : ''}
      `}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />

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

// ── Dot indicator ──────────────────────────────────────────────────────────────
function Dot({ active }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
  )
}

// ── Copy link button (per-row state) ──────────────────────────────────────────
function CopyLinkButton({ slug }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = window.location.origin + '/view/' + slug
    await copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const {
    canada,
    us,
    uploadFile,
    isSavingToSupabase,
    savingCountry,
    supabaseError,
    setSupabaseError,
    publishHistory,
  } = useDashboardStore()

  const slots = {
    canada: { payments: canada.payments, customers: canada.customers },
    us:     { payments: us.payments,     customers: us.customers },
  }

  const loadedCount = SLOTS.filter(s => slots[s.country][s.type].isLoaded).length
  const allReady    = canada.isReady && us.isReady
  const isSaving    = isSavingToSupabase
  const savingLabel = savingCountry === 'canada' ? 'Canada' : 'US'
  const historyRows = publishHistory.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Back link */}
        <div className="mb-6">
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Panda Hub
          </a>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
            Booking frequency dashboard
          </h1>
          <p className="text-sm text-gray-400">Upload data to preview and publish</p>
        </div>

        {/* ── SECTION 1: Upload ──────────────────────────────────────────── */}
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
            <p className="text-xs text-blue-700">Saving {savingLabel} data to database...</p>
          </div>
        )}

        {/* Error banner */}
        {supabaseError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-red-700">
                Failed to save to database: {supabaseError}
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
        <div className="flex items-center justify-between mb-12">
          <p className="text-xs text-gray-400">{loadedCount} of {SLOTS.length} files uploaded</p>
          <button
            onClick={() => router.push('/admin/preview')}
            disabled={!allReady || isSaving}
            title={isSaving ? 'Please wait while data is being saved…' : ''}
            className={`
              px-5 py-2 rounded-lg text-sm font-medium transition-colors
              ${allReady && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isSaving ? 'Saving...' : 'Preview Dashboard →'}
          </button>
        </div>

        {/* ── SECTION 2: Published Links ────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Published Links</h2>
          <p className="text-xs text-gray-400 mb-4">Share these links with your team</p>

          {historyRows.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-8 text-center">
              <p className="text-sm text-gray-500 mb-1">No published links yet.</p>
              <p className="text-xs text-gray-400">
                Upload data and publish to share with your team.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-center px-4 py-3 font-medium">Canada</th>
                    <th className="text-center px-4 py-3 font-medium">US</th>
                    <th className="text-left px-4 py-3 font-medium">Link</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, i) => {
                    const shortSlug = row.slug
                    const displayUrl = `…/view/${shortSlug}`
                    return (
                      <tr
                        key={row.id}
                        className={`${i < historyRows.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Dot active={!!row.canada_meta} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Dot active={!!row.us_meta} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono">{displayUrl}</td>
                        <td className="px-4 py-3 text-right">
                          <CopyLinkButton slug={row.slug} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
