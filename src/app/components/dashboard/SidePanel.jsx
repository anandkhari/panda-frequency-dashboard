'use client'

import { useState } from 'react'
import DateRangePicker from './DateRangePicker'

// ── Icons / shared sub-components ─────────────────────────────────────────────

function FilterIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M8 12h8M11 18h2" />
    </svg>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400 dark:text-[#6B6B70] uppercase px-5 pt-5 pb-2">
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-slate-200/60 dark:border-[#2D2D2F] mx-4 my-2" />
}

function SegmentButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`block w-[calc(100%-1.5rem)] mx-3 text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? 'bg-white dark:bg-[#2D2D2F] text-indigo-700 dark:text-[#F2F2F7] font-medium shadow-sm ring-1 ring-slate-200/50 dark:ring-[#3A3A3C]'
          : 'text-slate-600 dark:text-[#8E8E93] hover:bg-slate-200/50 dark:hover:bg-[#2D2D2F] hover:text-slate-900 dark:hover:text-[#F2F2F7]'
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
          ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200 dark:bg-[#3A3A3C] dark:text-[#F2F2F7] dark:ring-[#48484A]'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-[#AEAEB2] dark:hover:text-[#F2F2F7] dark:hover:bg-[#2D2D2F]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${
          active ? 'bg-indigo-600 shadow-sm dark:bg-[#F2F2F7]' : 'bg-gray-300 dark:bg-[#48484A]'
        }`}
      />
      {children}
    </button>
  )
}

function SectionHeader({ label, active, open, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-[calc(100%-1.5rem)] mx-3 text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
        active
          ? 'border-l-2 border-indigo-500 text-gray-900 font-semibold bg-indigo-50/50 dark:border-indigo-400 dark:text-[#F2F2F7] dark:bg-[#2D2D2F]'
          : 'text-gray-600 font-medium dark:text-[#8E8E93] hover:bg-slate-200/50 dark:hover:bg-[#2D2D2F] hover:text-gray-900 dark:hover:text-[#F2F2F7]'
      }`}
    >
      <span>{label}</span>
      <span className="text-xs text-slate-400 dark:text-[#6B6B70]">{open ? '∨' : '›'}</span>
    </button>
  )
}

function CountryPillToggle({ country, onChange }) {
  return (
    <div className="mx-3 flex items-center bg-slate-100 dark:bg-[#1C1C1E] rounded-full p-1">
      {['canada', 'us'].map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium transition-all duration-200 ${
            country === c
              ? 'bg-slate-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] shadow-sm'
              : 'text-slate-500 dark:text-[#6B6B70] hover:text-slate-700 dark:hover:text-[#F2F2F7]'
          }`}
        >
          {c === 'canada' ? 'Canada' : 'US'}
        </button>
      ))}
    </div>
  )
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function parseLocalDate(str) {
  if (!str) return null
  if (str instanceof Date) return str
  const [year, month, day] = String(str).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toLocalDateStr(d) {
  if (!d) return ''
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

const CURRENT_TYPES  = ['today','weekToDate','monthToDate','quarterToDate','yearToDate']
const PREVIOUS_TYPES = ['yesterday','lastWeek','lastMonth','lastQuarter','lastYear','lastN','since']

function isCurrentSection(dr)  { return CURRENT_TYPES.includes(dr?.type) }
function isPreviousSection(dr) { return PREVIOUS_TYPES.includes(dr?.type) }

function getInitialSection(dr) {
  if (isCurrentSection(dr))  return 'current'
  if (isPreviousSection(dr)) return 'previous'
  if (dr?.type === 'year')   return 'year'
  if (dr?.type === 'custom') return 'custom'
  return null
}

function getYears() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear - 1; y >= 2020; y--) years.push(y)
  return years
}

function initCustomStr(dr, key) {
  if (dr?.type !== 'custom') return ''
  const val = dr[key]
  if (!val) return ''
  if (val instanceof Date) return toLocalDateStr(val)
  return String(val)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SidePanel({
  country,
  onCountryChange,
  customerType,
  onSegmentChange,
  dateRange,
  onDateChange,
  availableYears,
  percentile,
  rawPercentile,
  onPercentileChange,
  repeatThreshold,
  rawRepeatThreshold,
  onRepeatThresholdChange,
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Date section state
  const [openSection, setOpenSection] = useState(() => getInitialSection(dateRange))
  const [lastN, setLastN] = useState(
    dateRange?.type === 'lastN'
      ? { n: dateRange.n, unit: dateRange.unit }
      : { n: 30, unit: 'days' }
  )
  const [sinceDate, setSinceDate] = useState(
    dateRange?.type === 'since' ? dateRange.date : ''
  )
  const [customStart, setCustomStart] = useState(() => initCustomStr(dateRange, 'start'))
  const [customEnd,   setCustomEnd]   = useState(() => initCustomStr(dateRange, 'end'))

  function toggleSection(name) {
    setOpenSection(prev => prev === name ? null : name)
  }

  // ── Panel content ───────────────────────────────────────────────────────────
  const panelContent = (
    <div className="pb-8 mt-10">

      {/* Logo */}
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
        <SegmentButton active={customerType === 'all'} onClick={() => onSegmentChange('all')}>All customers</SegmentButton>
        <SegmentButton active={customerType === 'sub'} onClick={() => onSegmentChange('sub')}>Subscribers</SegmentButton>
        <SegmentButton active={customerType === 'non'} onClick={() => onSegmentChange('non')}>Non-subscribers</SegmentButton>
      </div>

      {/* Percentile */}
      <Divider />
      <SectionLabel>Percentile</SectionLabel>
      <div className="flex items-center justify-between px-3 mb-2">
        <button
          onClick={() => onPercentileChange(Math.max(1, rawPercentile - 1))}
          disabled={rawPercentile === 1}
          className="w-7 h-7 rounded-full border border-slate-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2D2D2F] text-slate-600 dark:text-[#AEAEB2] text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#3A3A3C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >−</button>
        <span className={`text-sm font-semibold min-w-[48px] text-center ${rawPercentile === 50 ? 'text-slate-600 dark:text-[#8E8E93]' : 'text-indigo-600 dark:text-[#F2F2F7]'}`}>
          P{rawPercentile}
        </span>
        <button
          onClick={() => onPercentileChange(Math.min(99, rawPercentile + 1))}
          disabled={rawPercentile === 99}
          className="w-7 h-7 rounded-full border border-slate-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2D2D2F] text-slate-600 dark:text-[#AEAEB2] text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#3A3A3C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >+</button>
      </div>
      <div className="px-3 mb-1">
        <input type="range" min={1} max={99} value={rawPercentile}
          onChange={e => onPercentileChange(Number(e.target.value))}
          className="w-full h-1 accent-indigo-500 dark:accent-[#F2F2F7] cursor-pointer"
        />
      </div>
      <div className="px-3 mb-3 flex justify-between text-[10px] text-slate-400 dark:text-[#6B6B70]">
        <span>P1</span><span>P25</span><span>P50</span><span>P75</span><span>P99</span>
      </div>

      {/* Repeat Rate */}
      <Divider />
      <SectionLabel>Repeat Rate</SectionLabel>
      <div className="flex items-center justify-between px-3 mb-2">
        <button
          onClick={() => onRepeatThresholdChange(Math.max(1, rawRepeatThreshold - 1))}
          disabled={rawRepeatThreshold === 1}
          className="w-7 h-7 rounded-full border border-slate-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2D2D2F] text-slate-600 dark:text-[#AEAEB2] text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#3A3A3C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >−</button>
        <span className="text-sm font-semibold min-w-[80px] text-center text-slate-600 dark:text-[#8E8E93]">
          {rawRepeatThreshold}+ bookings
        </span>
        <button
          onClick={() => onRepeatThresholdChange(Math.min(5, rawRepeatThreshold + 1))}
          disabled={rawRepeatThreshold === 5}
          className="w-7 h-7 rounded-full border border-slate-200 dark:border-[#3A3A3C] bg-white dark:bg-[#2D2D2F] text-slate-600 dark:text-[#AEAEB2] text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#3A3A3C] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
        >+</button>
      </div>
      <div className="px-3 mb-1">
        <input type="range" min={1} max={5} value={rawRepeatThreshold}
          onChange={e => onRepeatThresholdChange(Number(e.target.value))}
          className="w-full h-1 accent-green-500 dark:accent-[#F2F2F7] cursor-pointer"
        />
      </div>
      <div className="px-3 mb-3 flex justify-between text-[10px] text-slate-400 dark:text-[#6B6B70]">
        <span>1+</span><span>2+</span><span>3+</span><span>4+</span><span>5+</span>
      </div>

      {/* ── Date range ──────────────────────────────────────────────────────── */}
      <Divider />
      <SectionLabel>Date range</SectionLabel>
      <div className="flex flex-col gap-0.5 pb-2">

        {/* All time */}
        <DateOption active={dateRange === 0} onClick={() => onDateChange(0)}>
          All time
        </DateOption>

        <Divider />

        {/* Current period ── collapsible */}
        <SectionHeader
          label="Current"
          active={isCurrentSection(dateRange)}
          open={openSection === 'current'}
          onClick={() => toggleSection('current')}
        />
        {openSection === 'current' && (
          <div className="flex flex-col gap-0.5 ml-2 mb-1">
            <DateOption active={dateRange?.type === 'today'}         onClick={() => onDateChange({ type: 'today' })}>Today</DateOption>
            <DateOption active={dateRange?.type === 'weekToDate'}    onClick={() => onDateChange({ type: 'weekToDate' })}>Week to date</DateOption>
            <DateOption active={dateRange?.type === 'monthToDate'}   onClick={() => onDateChange({ type: 'monthToDate' })}>Month to date</DateOption>
            <DateOption active={dateRange?.type === 'quarterToDate'} onClick={() => onDateChange({ type: 'quarterToDate' })}>Quarter to date</DateOption>
            <DateOption active={dateRange?.type === 'yearToDate'}    onClick={() => onDateChange({ type: 'yearToDate' })}>Year to date</DateOption>
          </div>
        )}

        {/* Previous period ── collapsible */}
        <SectionHeader
          label="Previous"
          active={isPreviousSection(dateRange)}
          open={openSection === 'previous'}
          onClick={() => toggleSection('previous')}
        />
        {openSection === 'previous' && (
          <div className="flex flex-col gap-0.5 ml-2 mb-1">
            <DateOption active={dateRange?.type === 'yesterday'}   onClick={() => onDateChange({ type: 'yesterday' })}>Yesterday</DateOption>
            <DateOption active={dateRange?.type === 'lastWeek'}    onClick={() => onDateChange({ type: 'lastWeek' })}>Last week</DateOption>
            <DateOption active={dateRange?.type === 'lastMonth'}   onClick={() => onDateChange({ type: 'lastMonth' })}>Last month</DateOption>
            <DateOption active={dateRange?.type === 'lastQuarter'} onClick={() => onDateChange({ type: 'lastQuarter' })}>Last quarter</DateOption>
            <DateOption active={dateRange?.type === 'lastYear'}    onClick={() => onDateChange({ type: 'lastYear' })}>Last year</DateOption>

            <Divider />

            {/* Last N */}
            <div className="px-3 py-1">
              <p className="text-[11px] text-slate-400 dark:text-[#6B6B70] mb-1.5">Last N</p>
              <div className="flex gap-1.5 items-center">
                <input
                  type="number" min={1} max={999}
                  value={lastN.n}
                  onChange={e => setLastN({ ...lastN, n: Number(e.target.value) })}
                  className="w-14 text-sm border border-slate-200 dark:border-[#3A3A3C] rounded-lg px-2 py-1.5 bg-white dark:bg-[#242426] text-slate-700 dark:text-[#F2F2F7] focus:outline-none"
                />
                <select
                  value={lastN.unit}
                  onChange={e => setLastN({ ...lastN, unit: e.target.value })}
                  className="flex-1 text-sm border border-slate-200 dark:border-[#3A3A3C] rounded-lg px-2 py-1.5 bg-white dark:bg-[#242426] text-slate-700 dark:text-[#F2F2F7] focus:outline-none"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
                <button
                  onClick={() => onDateChange({ type: 'lastN', n: lastN.n, unit: lastN.unit })}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Since */}
            <div className="px-3 py-1">
              <p className="text-[11px] text-slate-400 dark:text-[#6B6B70] mb-1.5">Since</p>
              <DateRangePicker
                value={sinceDate ? parseLocalDate(sinceDate) : null}
                onChange={d => {
                  const str = toLocalDateStr(d)
                  setSinceDate(str)
                  onDateChange({ type: 'since', date: str })
                }}
                placeholder="MM/DD/YYYY"
                maxDate={new Date()}
              />
            </div>
          </div>
        )}

        {/* Specific year ── collapsible */}
        <SectionHeader
          label="Specific year"
          active={dateRange?.type === 'year'}
          open={openSection === 'year'}
          onClick={() => toggleSection('year')}
        />
        {openSection === 'year' && (
          <div className="px-4 py-2 mb-1">
            <select
              value={dateRange?.type === 'year' ? String(dateRange.year) : ''}
              onChange={e => {
                if (!e.target.value) return
                onDateChange({ type: 'year', year: Number(e.target.value) })
              }}
              className="w-full text-sm border border-slate-200 dark:border-[#3A3A3C] rounded-lg px-3 py-2 bg-white dark:bg-[#2D2D2F] text-slate-700 dark:text-[#F2F2F7] focus:outline-none"
            >
              <option value="" disabled>Select year...</option>
              {getYears().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        <Divider />

        {/* Pre-2.0 launch */}
        <DateOption active={dateRange?.type === 'pre20'} onClick={() => onDateChange({ type: 'pre20' })}>
          Pre-2.0 launch
        </DateOption>
        <span className="text-[10px] text-slate-400 dark:text-[#6B6B70] px-6 -mt-1.5 pb-0.5">
          All time → May 31 2026
        </span>

        {/* Post-2.0 launch */}
        <DateOption active={dateRange?.type === 'post20'} onClick={() => onDateChange({ type: 'post20' })}>
          Post-2.0 launch
        </DateOption>
        <span className="text-[10px] text-slate-400 dark:text-[#6B6B70] px-6 -mt-1.5 pb-0.5">
          Jun 1 2026 → today
        </span>

        <Divider />

        {/* Custom range ── collapsible */}
        <SectionHeader
          label="Custom range"
          active={dateRange?.type === 'custom'}
          open={openSection === 'custom'}
          onClick={() => toggleSection('custom')}
        />
        {openSection === 'custom' && (
          <div className="flex flex-col gap-3 px-3 pt-1 pb-2 mx-1">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-[#8E8E93] mb-1.5">From</p>
              <DateRangePicker
                value={customStart ? parseLocalDate(customStart) : null}
                onChange={d => {
                  const str = toLocalDateStr(d)
                  setCustomStart(str)
                  if (customEnd) onDateChange({ type: 'custom', start: str, end: customEnd })
                }}
                placeholder="MM/DD/YYYY"
                maxDate={customEnd ? parseLocalDate(customEnd) : new Date()}
              />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-[#8E8E93] mb-1.5">To</p>
              <DateRangePicker
                value={customEnd ? parseLocalDate(customEnd) : null}
                onChange={d => {
                  const str = toLocalDateStr(d)
                  setCustomEnd(str)
                  if (customStart) onDateChange({ type: 'custom', start: customStart, end: str })
                }}
                placeholder="MM/DD/YYYY"
                minDate={customStart ? parseLocalDate(customStart) : undefined}
                maxDate={new Date()}
              />
            </div>
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
        className="md:hidden fixed bottom-20 right-6 z-50 flex items-center gap-2 bg-slate-900 dark:bg-[#F2F2F7] text-white dark:text-[#1C1C1E] rounded-full px-5 py-3 text-sm font-semibold shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
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
        className={`fixed top-0 h-screen w-64 bg-slate-50/80 dark:bg-[#242426] backdrop-blur-xl border-r border-slate-200/60 dark:border-[#2D2D2F] overflow-y-auto transition-transform duration-300 ease-out z-50 md:z-40 md:left-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } scrollbar-hide`}
      >
        {panelContent}
      </aside>
    </>
  )
}
