'use client'

import { useState, useEffect } from 'react'
import { loadLatestSnapshot } from '@/lib/supabaseService'

function PandaIcon() {
  return (
    <svg viewBox="0 0 64 64" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" className="fill-gray-900 dark:fill-white" />
      <circle cx="12" cy="12" r="9"  className="fill-gray-900 dark:fill-white" />
      <circle cx="52" cy="12" r="9"  className="fill-gray-900 dark:fill-white" />
      <circle cx="32" cy="34" r="20" fill="white" />
      <ellipse cx="22" cy="27" rx="7" ry="6" className="fill-gray-900 dark:fill-gray-800" />
      <ellipse cx="42" cy="27" rx="7" ry="6" className="fill-gray-900 dark:fill-gray-800" />
      <circle cx="22" cy="27" r="3" fill="white" />
      <circle cx="23" cy="27" r="1.5" className="fill-gray-900 dark:fill-gray-950" />
      <circle cx="42" cy="27" r="3" fill="white" />
      <circle cx="43" cy="27" r="1.5" className="fill-gray-900 dark:fill-gray-950" />
      <ellipse cx="32" cy="36" rx="4" ry="2.5" className="fill-gray-400" />
    </svg>
  )
}

export default function LandingPage() {
  const [isChecking, setIsChecking]         = useState(true)
  const [hasPublishedData, setHasPublished] = useState(false)
  const [latestSlug, setLatestSlug]         = useState(null)

  useEffect(() => {
    loadLatestSnapshot()
      .then(snap => {
        if (snap) {
          setHasPublished(true)
          setLatestSlug(snap.slug)
        }
      })
      .catch(() => {
        // Supabase down — silently hide View Dashboard
      })
      .finally(() => setIsChecking(false))
  }, [])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const viewBtnClass = `
    block w-full text-center
    bg-gray-900 dark:bg-white
    text-white dark:text-gray-900
    px-6 py-3 rounded-xl
    text-sm font-medium
    hover:opacity-90 transition-opacity duration-150
  `

  const adminBtnClassPrimary = `
    block w-full text-center
    bg-gray-900 dark:bg-white
    text-white dark:text-gray-900
    px-6 py-3 rounded-xl
    text-sm font-medium
    hover:opacity-90 transition-opacity duration-150
  `

  const adminBtnClassSecondary = `
    block w-full text-center
    bg-white dark:bg-gray-900
    text-gray-700 dark:text-gray-300
    border border-gray-200 dark:border-gray-700
    px-6 py-3 rounded-xl
    text-sm font-medium
    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150
  `

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6">

      <div style={{ marginBottom: 20 }}>
        <PandaIcon />
      </div>

      <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white" style={{ marginBottom: 4 }}>
        Panda Hub
      </h1>

      <p className="text-sm font-medium text-gray-500 dark:text-gray-400" style={{ marginBottom: 8 }}>
        Booking Frequency Dashboard
      </p>

      <p className="text-sm text-gray-400 dark:text-gray-500 text-center" style={{ maxWidth: 300, marginBottom: 40 }}>
        Analytics for your car detailing marketplace — powered by your Stripe data
      </p>

      <div className="flex flex-col w-full" style={{ maxWidth: 280, gap: 12 }}>
        {hasPublishedData && (
          <a href={'/view/' + latestSlug} className={viewBtnClass}>
            View Dashboard →
          </a>
        )}

        <a
          href="/admin"
          className={hasPublishedData ? adminBtnClassSecondary : adminBtnClassPrimary}
        >
          Go to Admin Panel →
        </a>
      </div>

    </div>
  )
}
