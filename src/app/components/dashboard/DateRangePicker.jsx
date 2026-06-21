'use client'

import { useState, useRef, useEffect } from 'react'

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Mo','Tu','We','Th','Fr','Sa','Su']

function MiniCalendar({ value, onChange, minDate, maxDate }) {
  const [viewing, setViewing] = useState(
    value ? new Date(value) : new Date()
  )

  useEffect(() => {
    if (value) setViewing(new Date(value))
  }, [value])

  const year  = viewing.getFullYear()
  const month = viewing.getMonth()

  const firstDay  = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  const dow = startDate.getDay()
  startDate.setDate(startDate.getDate() + (dow === 0 ? -6 : 1 - dow))

  const days   = []
  const cursor = new Date(startDate)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const todayStr = new Date().toDateString()

  return (
    <div className="p-3 w-[224px]">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewing(new Date(year, month - 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-[#3A3A3C] text-slate-600 dark:text-[#8E8E93] text-sm leading-none"
        >‹</button>
        <span className="text-[13px] font-medium text-slate-800 dark:text-[#F2F2F7]">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={() => setViewing(new Date(year, month + 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-[#3A3A3C] text-slate-600 dark:text-[#8E8E93] text-sm leading-none"
        >›</button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] text-slate-400 dark:text-[#6B6B70] pb-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isSelected = value &&
            day.toDateString() === new Date(value).toDateString()
          const isToday = day.toDateString() === todayStr
          const isDisabled =
            (minDate && day < minDate) ||
            (maxDate && day > maxDate)

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onChange(day)}
              className={[
                'text-center text-[12px] py-1 rounded transition-colors',
                isSelected
                  ? 'bg-gray-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] font-medium'
                  : isDisabled
                  ? 'text-slate-200 dark:text-[#3A3A3C] cursor-not-allowed'
                  : !isCurrentMonth
                  ? 'text-slate-300 dark:text-[#3A3A3C] cursor-pointer'
                  : 'text-slate-800 dark:text-[#F2F2F7] hover:bg-slate-100 dark:hover:bg-[#3A3A3C] cursor-pointer',
                isToday && !isSelected
                  ? 'ring-1 ring-slate-500 dark:ring-[#6B6B70]'
                  : '',
              ].filter(Boolean).join(' ')}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// FIX: More robust date parser that handles
// partial input and all common formats
function parseInputDate(raw) {
  const str = (raw || '').trim()
  if (!str) return null

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return isValidDate(date, y, m, d) ? date : null
  }

  // MM/DD/YYYY or M/D/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/').map(Number)
    const date = new Date(y, m - 1, d)
    return isValidDate(date, y, m, d) ? date : null
  }

  // MM-DD-YYYY or M-D-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(str)) {
    const [m, d, y] = str.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return isValidDate(date, y, m, d) ? date : null
  }

  return null
}

// FIX: Validate that date components are real
function isValidDate(date, y, m, d) {
  return (
    !isNaN(date.getTime()) &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d &&
    y > 1900 && y < 2100 &&
    m >= 1 && m <= 12 &&
    d >= 1 && d <= 31
  )
}

function toDisplayStr(date) {
  if (!date) return ''
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}/${d}/${date.getFullYear()}`
}

export default function DateRangePicker({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
  minDate,
  maxDate,
}) {
  const [inputVal, setInputVal]     = useState(
    value ? toDisplayStr(value) : ''
  )
  const [showCal, setShowCal]       = useState(false)
  const [openUp, setOpenUp]         = useState(false)
  const [inputError, setInputError] = useState(false)
  const [errorMsg, setErrorMsg]     = useState('')
  const inputRef     = useRef(null)
  const containerRef = useRef(null)

  // Sync when value changes externally
  useEffect(() => {
    setInputVal(value ? toDisplayStr(value) : '')
    setInputError(false)
    setErrorMsg('')
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!showCal) return
    function onDown(e) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setShowCal(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showCal])

  function handleCalToggle() {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setOpenUp(window.innerHeight - rect.bottom < 280)
    setShowCal(s => !s)
  }

  function handleChange(e) {
    setInputVal(e.target.value)
    setInputError(false)
    setErrorMsg('')
  }

  // FIX: On blur validate and apply
  // but show clear error message
  // do NOT reset input unless user
  // explicitly types something invalid
  function handleBlur() {
    const str = inputVal.trim()

    // Empty → clear the value
    if (!str) {
      setInputError(false)
      setErrorMsg('')
      return
    }

    // Try to parse
    const parsed = parseInputDate(str)

    // Invalid format
    if (!parsed) {
      setInputError(true)
      setErrorMsg('Use MM/DD/YYYY format')
      return
    }

    // Below minimum date
    if (minDate && parsed < minDate) {
      setInputError(true)
      setErrorMsg('Date is too early')
      setInputVal(value ? toDisplayStr(value) : '')
      return
    }

    // Above maximum date
    if (maxDate && parsed > maxDate) {
      setInputError(true)
      setErrorMsg('Date is too late')
      setInputVal(value ? toDisplayStr(value) : '')
      return
    }

    // Valid — apply
    setInputError(false)
    setErrorMsg('')
    setInputVal(toDisplayStr(parsed))
    onChange(parsed)
  }

  // FIX: Handle Enter key to apply date
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setInputVal(value ? toDisplayStr(value) : '')
      setInputError(false)
      setErrorMsg('')
      setShowCal(false)
    }
  }

  function handleCalSelect(day) {
    setShowCal(false)
    setInputVal(toDisplayStr(day))
    setInputError(false)
    setErrorMsg('')
    onChange(day)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={[
            'flex-1 min-w-0 text-sm rounded-lg px-3 py-1.5 border transition-all',
            'bg-white dark:bg-[#242426]',
            'text-slate-700 dark:text-[#F2F2F7]',
            'placeholder:text-slate-300 dark:placeholder:text-[#6B6B70]',
            'focus:outline-none focus:ring-2',
            'focus:ring-indigo-500/20 focus:border-indigo-500',
            inputError
              ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-slate-200 dark:border-[#3A3A3C]',
          ].join(' ')}
        />
        <button
          type="button"
          onClick={handleCalToggle}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2D2D2F] text-slate-500 dark:text-[#8E8E93] hover:bg-slate-50 dark:hover:bg-[#3A3A3C] transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {/* FIX: Show error message below input */}
      {inputError && errorMsg && (
        <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 px-1">
          {errorMsg} (e.g. 06/21/2026)
        </p>
      )}

      {showCal && (
        <div className={[
          'absolute z-[200] left-0',
          'bg-white dark:bg-[#242426]',
          'border border-slate-100 dark:border-[#2D2D2F]',
          'rounded-xl shadow-lg',
          openUp ? 'bottom-full mb-1' : 'top-full mt-1',
        ].join(' ')}>
          <MiniCalendar
            value={value}
            onChange={handleCalSelect}
            minDate={minDate}
            maxDate={maxDate}
          />
        </div>
      )}
    </div>
  )
}