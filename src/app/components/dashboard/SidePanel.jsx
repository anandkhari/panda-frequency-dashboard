'use client'

import { useState } from 'react'

// ── Icons ───────────────────────────────────────────────────────────────────
function FilterIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 12h8M11 18h2" />
    </svg>
  )
}

// ── Layout helpers ──────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 uppercase px-5 pt-5 pb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-slate-200/60 mx-4 my-2" />
}

function SegmentButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`block w-[calc(100%-1.5rem)] mx-3 text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? 'bg-white text-indigo-700 font-medium shadow-sm ring-1 ring-slate-200/50'
          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function DateOption({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-[calc(100%-1.5rem)] mx-3 text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? 'bg-white text-indigo-700 font-medium shadow-sm ring-1 ring-slate-200/50'
          : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${
          active ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]' : 'bg-slate-300'
        }`}
      />
      {children}
    </button>
  )
}

function CountryPillToggle({ country, onChange }) {
  return (
    <div className="mx-3 flex items-center bg-slate-100 rounded-full p-1">
      {['canada', 'us'].map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-all duration-200 ${
            country === c
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {c === 'canada' ? 'Canada' : 'US'}
        </button>
      ))}
    </div>
  )
}

function isDateActive(dateRange, value) {
  if (typeof value === 'number') return typeof dateRange === 'number' && dateRange === value
  return typeof dateRange === 'object' && dateRange !== null && dateRange.type === value.type
}

function getYears() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= 2020; y--) {
    years.push(y)
  }
  return years
}

// ── Component ───────────────────────────────────────────────────────────────
export default function SidePanel({
  country,
  onCountryChange,
  customerType,
  onSegmentChange,
  dateRange,
  onDateChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(
    dateRange?.type === 'custom'
  )
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const isYearActive = dateRange?.type === 'year'
  const isCustomActive = dateRange?.type === 'custom'
  const isRelativeActive = typeof dateRange === 'number'
  const canApplyCustom = !!(customStart && customEnd)

  function handleApplyCustom() {
    if (!canApplyCustom) return
    onDateChange({
      type: 'custom',
      start: new Date(customStart),
      end: new Date(customEnd),
    })
  }

  const panelContent = (
    <div className="pb-8 mt-10">

      {/* Logo area */}
      <div className="flex items-center gap-3 pt-6 px-6 pb-4">
        <img
          src="/logo.jpeg"
          alt="Panda Hub Logo"
          className="w-32 h-12 shrink-0 drop-shadow-sm rounded-4xl"
        />
      </div>

      <Divider />

      {/* Country */}
      <SectionLabel>Country</SectionLabel>
      <CountryPillToggle country={country} onChange={onCountryChange} />

      {/* Segment */}
      <SectionLabel>Segment</SectionLabel>
      <div className="flex flex-col gap-1">
        <SegmentButton
          active={customerType === 'all'}
          onClick={() => onSegmentChange('all')}
        >
          All customers
        </SegmentButton>
        <SegmentButton
          active={customerType === 'sub'}
          onClick={() => onSegmentChange('sub')}
        >
          Subscribers
        </SegmentButton>
        <SegmentButton
          active={customerType === 'non'}
          onClick={() => onSegmentChange('non')}
        >
          Non-subscribers
        </SegmentButton>
      </div>

      {/* Date range */}
      <SectionLabel>Date range</SectionLabel>
      <div className="flex flex-col gap-1">

        {/* Relative period dropdown */}
        <div className="px-4 mx-1 mb-2">
          <select
            value={isRelativeActive ? String(dateRange) : ''}
            onChange={e => {
              if (e.target.value === '') return
              onDateChange(Number(e.target.value))
            }}
            className={`w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
              isRelativeActive
                ? 'text-indigo-700 font-medium ring-1 ring-indigo-100'
                : 'text-slate-600 cursor-pointer'
            }`}
          >
            <option value="" disabled>Select relative period...</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
            <option value="365">Last 12 months</option>
            <option value="0">All time</option>
          </select>
        </div>

        <Divider />

        <DateOption
          active={isDateActive(dateRange, { type: 'monthToDate' })}
          onClick={() => onDateChange({ type: 'monthToDate' })}
        >
          Month to date
        </DateOption>

        <DateOption
          active={isDateActive(dateRange, { type: 'yearToDate' })}
          onClick={() => onDateChange({ type: 'yearToDate' })}
        >
          Year to date
        </DateOption>

        <Divider />

        <DateOption
          active={isDateActive(dateRange, { type: 'lastYear' })}
          onClick={() => onDateChange({ type: 'lastYear' })}
        >
          Last year
        </DateOption>

        <Divider />

        {/* Specific year dropdown */}
        <div className="px-4 mx-1 mt-1 mb-2">
          <label className="block text-[11px] font-semibold tracking-wide text-slate-400 uppercase mb-1.5 pl-1">
            Specific year
          </label>
          <select
            value={isYearActive ? String(dateRange.year) : ''}
            onChange={e => {
              if (e.target.value === '') return
              onDateChange({
                type: 'year',
                year: Number(e.target.value),
              })
            }}
            className={`w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
              isYearActive
                ? 'text-indigo-700 font-medium ring-1 ring-indigo-100'
                : 'text-slate-600 cursor-pointer'
            }`}
          >
            <option value="" disabled>Select year...</option>
            {getYears().map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <Divider />

        {/* Custom range */}
        <DateOption
          active={isCustomActive}
          onClick={() => setShowCustom(true)}
        >
          Custom range
        </DateOption>

        {showCustom && (
          <div className="flex flex-col gap-3 px-4 mx-1 mt-3 bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200/50">
            <label className="text-xs font-medium text-slate-500">
              From
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="mt-1.5 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              To
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="mt-1.5 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </label>
            <button
              onClick={handleApplyCustom}
              disabled={!canApplyCustom}
              className={`mt-2 w-full text-sm font-medium rounded-lg px-3 py-2.5 transition-all duration-200 ${
                canApplyCustom
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Apply Filter
            </button>
          </div>
        )}

      </div>
    </div>
  )

  return (
    <>
      {/* Mobile floating Filters button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white rounded-full px-5 py-3 text-sm font-semibold shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
      >
        <FilterIcon className="w-4 h-4" />
        Filters
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[45] transition-opacity"
        />
      )}

      {/* Side panel */}
      <aside
        className={`fixed top-0 h-screen w-64 bg-slate-50/80 backdrop-blur-xl border-r border-slate-200/60 overflow-y-auto transition-transform duration-300 ease-out z-50 md:z-40 md:left-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } scrollbar-hide`}
      >
        {panelContent}
      </aside>
    </>
  )
}