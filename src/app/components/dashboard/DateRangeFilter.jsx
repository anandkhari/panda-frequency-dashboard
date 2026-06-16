'use client'

import { useState } from 'react'

// ── Label helper — used by KPIBooking and data summary lines ──────────────────
export function getFilterLabel(dateRange) {
  if (typeof dateRange === 'number') {
    if (dateRange === 0) return 'All time'
    if (dateRange === 365) return 'Last 12 months'
    return 'Last ' + dateRange + ' days'
  }
  if (dateRange?.type === 'currentYear') return 'Current year'
  if (dateRange?.type === 'monthToDate') return 'Month to date'
  if (dateRange?.type === 'yearToDate') return 'Year to date'
  if (dateRange?.type === 'lastYear') return 'Last year'
  if (dateRange?.type === 'year') return String(dateRange.year)
  if (dateRange?.type === 'custom') {
    const s = new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const e = new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return s + ' – ' + e
  }
  return 'Last 90 days'
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function toDateStr(date) {
  const d = date instanceof Date ? date : new Date(date)
  return d.toISOString().split('T')[0]
}

function todayStr() {
  return toDateStr(new Date())
}

function daysAgoStr(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateStr(d)
}

function toSelectValue(dateRange) {
  if (typeof dateRange === 'number') return String(dateRange)
  if (dateRange?.type === 'custom') return 'custom'
  if (typeof dateRange === 'object' && dateRange !== null) return JSON.stringify(dateRange)
  return '90'
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DateRangeFilter({ dateRange, onChange, availableYears = [] }) {
  const isCustom = dateRange?.type === 'custom'

  const [showCustom, setShowCustom] = useState(isCustom)
  const [customStart, setCustomStart] = useState(
    isCustom ? toDateStr(dateRange.start) : daysAgoStr(30)
  )
  const [customEnd, setCustomEnd] = useState(
    isCustom ? toDateStr(dateRange.end) : todayStr()
  )

  const selectValue = showCustom ? 'custom' : toSelectValue(dateRange)

  function handleSelectChange(e) {
    const raw = e.target.value

    if (raw === 'custom') {
      setShowCustom(true)
      return
    }

    setShowCustom(false)

    const num = Number(raw)
    if (raw !== '' && !isNaN(num)) {
      onChange(num)
      return
    }

    try {
      onChange(JSON.parse(raw))
    } catch {
      onChange(90)
    }
  }

  function handleApply() {
    if (!customStart || !customEnd) return
    if (new Date(customStart) > new Date(customEnd)) return
    onChange({
      type: 'custom',
      start: new Date(customStart),
      end: new Date(customEnd),
    })
  }

  const canApply = !!(customStart && customEnd && new Date(customStart) <= new Date(customEnd))

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selectValue}
        onChange={handleSelectChange}
        className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
      >
        <optgroup label="Relative">
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
          <option value="365">Last 12 months</option>
          <option value="0">All time</option>
        </optgroup>
        <optgroup label="By Year">
          <option value={JSON.stringify({ type: 'currentYear' })}>Current year</option>
          <option value={JSON.stringify({ type: 'lastYear' })}>Last year</option>
          {availableYears.map(y => (
            <option key={y} value={JSON.stringify({ type: 'year', year: y })}>{y}</option>
          ))}
        </optgroup>
        <optgroup label="Custom">
          <option value="custom">Custom range</option>
        </optgroup>
      </select>

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customStart}
            max={customEnd || todayStr()}
            onChange={e => setCustomStart(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={todayStr()}
            onChange={e => setCustomEnd(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
          <button
            onClick={handleApply}
            disabled={!canApply}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              canApply
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
