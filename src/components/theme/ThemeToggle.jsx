'use client'

import { useState } from 'react'
import { THEME_STORAGE_KEY } from './theme'

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const activeTheme = document.documentElement.getAttribute('data-theme')
  if (activeTheme === 'light' || activeTheme === 'dark') {
    return activeTheme
  }

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
  } catch (error) {
    // Ignore storage access failures and fall back to the browser preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)

  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  const handleToggle = () => {
    setTheme(nextTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch (error) {
      // Ignore storage write failures so the toggle still works.
    }

    document.documentElement.setAttribute('data-theme', nextTheme)
    document.documentElement.style.colorScheme = nextTheme
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Switch to ${nextTheme} mode`}
      className="group fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs font-medium text-[var(--theme-foreground)] shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--theme-accent)]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--theme-accent-soft)] text-[var(--theme-accent)]">
        {theme === 'dark' ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 12.79A9 9 0 1111.21 3c-.13.42-.21.87-.21 1.33A7.67 7.67 0 0018.67 12c0 .46-.05.91-.16 1.33.82-.28 1.6-.72 2.49-1.54Z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 2.5v2.25M12 19.25v2.25M4.75 4.75l1.6 1.6M17.65 17.65l1.6 1.6M2.5 12h2.25M19.25 12h2.25M4.75 19.25l1.6-1.6M17.65 6.35l1.6-1.6" />
          </svg>
        )}
      </span>
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
