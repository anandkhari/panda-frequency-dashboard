# Car Detailing Marketplace — Booking Frequency Dashboard

A Next.js analytics dashboard for a car detailing marketplace. Upload Stripe CSV exports (payments + customers) for Canada and/or the US and explore customer cohort data, lifetime value, booking frequency, refund health, and subscriber segmentation — all computed in the browser. Processed snapshots are persisted to Supabase so any team member who opens the dashboard URL sees the latest data without re-uploading.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Supabase Integration](#supabase-integration)
   - [Environment Setup](#environment-setup)
   - [Database Tables](#database-tables)
   - [src/lib/supabase.js](#srclibsupabasejs)
   - [src/lib/supabaseService.js](#srclibsupabaseservicejs)
   - [lib/analytics/join.js — prepareSavePayload](#libanalyticsjoinjs--preparesavepayload)
   - [Store changes — dashboardStore.js](#store-changes--dashboardstorejs)
   - [Fallback behavior when Supabase is unreachable](#fallback-behavior-when-supabase-is-unreachable)
   - [Date hydration after Supabase load](#date-hydration-after-supabase-load)
4. [Full Data Pipeline](#full-data-pipeline)
5. [File-by-File Calculation Reference](#file-by-file-calculation-reference)
   - [lib/analytics/constants.js](#libanalyticsconstantsjs)
   - [lib/analytics/parse.js](#libanalyticsparse-js-legacy)
   - [lib/analytics/filter.js](#libanalyticsfilterjs)
   - [lib/analytics/metrics.js](#libanalyticsmetricsjs)
   - [src/hooks/useDashboard.js](#srchooksusedashboardjs)
   - [src/app/page.js](#srcapppagejs)
   - [src/app/components/dashboard/KPIStrip.jsx](#srcappcomponentsdashboardkpistripjsx-dead-code)
   - [src/app/components/dashboard/BucketBarChart.jsx](#srcappcomponentsdashboardbucketchartjsx)
   - [src/app/components/dashboard/LTVDonutChart.jsx](#srcappcomponentsdashboardltvdonutchartjsx)
   - [src/app/components/dashboard/AvgMedianChart.jsx](#srcappcomponentsdashboardavgmedianchartjsx-dead-code)
   - [src/app/components/dashboard/BucketTable.jsx](#srcappcomponentsdashboardbuckettablejsx)
6. [What Is Not Calculated Yet](#what-is-not-calculated-yet)
7. [Known Bugs and Edge Cases](#known-bugs-and-edge-cases)

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route | Purpose |
|---|---|
| `/` | Public dashboard — requires data to be uploaded first |
| `/admin` | Upload panel — 4 CSV files (CA payments, CA customers, US payments, US customers) |
| `/dashboard` | Redirects to `/` |

---

## Architecture Overview

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (JavaScript only, no TypeScript) |
| Styling | Tailwind CSS |
| Charts | Recharts v3 |
| CSV parsing | PapaParse (client-side) |
| Global state | React Context (`DashboardProvider` in `src/store/dashboardStore.js`) |
| Database | Supabase (PostgreSQL) — persists processed snapshots for team sharing |

**Two CSV formats are supported:**

- **Old format** (single-file Canada export): columns `customer_id`, `net_volume`, `payment_count`, etc. Handled by `lib/analytics/parse.js`.
- **New format** (separate Stripe exports): `payments.csv` with columns `Customer ID`, `Amount`, `Status`, `Description`, etc. and `customers.csv` with columns `id`, `Total Spend`, `Payment Count`, etc. Handled by `lib/analytics/parsePayments.js` + `lib/analytics/parseCustomers.js` + `lib/analytics/join.js`.

---

## Supabase Integration

The dashboard persists processed data snapshots to Supabase so that any team member who opens `/` in a browser sees the latest uploaded data without needing to re-upload the CSVs themselves. Raw CSV rows are **never** stored — only the final joined and classified customer records.

---

### Environment Setup

Add the following to `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

> **Note:** The `src/lib/supabase.js` client also accepts the variable name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as a fallback, since Supabase's newer dashboard generates keys under that name. Either variable name works — you do not need both.

---

### Database Tables

Two tables are required. Policies and table creation are managed in the Supabase dashboard — the application code does not run migrations.

#### `dashboard_snapshots`

Stores the current processed snapshot for each country. At most one row per country at any time — each upload overwrites the previous row.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated |
| `country` | `text` | `'canada'` or `'us'` |
| `uploaded_at` | `timestamptz` | When this snapshot was saved |
| `payments_count` | `integer` | Number of raw payment rows parsed |
| `customers_count` | `integer` | Number of raw customer rows parsed |
| `latest_payment_date` | `timestamptz` | ISO date of the most recent payment in the file |
| `joined_customers` | `jsonb` | Array of joined + classified customer records (see shape below) |
| `subscriber_ids` | `jsonb` | Array of customer ID strings where `isSubscriber === true` |

**`joined_customers` record shape (per element):**

Each element is a fully processed customer record including booking metrics, outcome counts, lifetime values from the customers CSV, subscriber flag, and bucket assignment. Date fields (`firstPayment`, `lastPayment`) are stored as ISO strings and hydrated back to `Date` objects on load.

#### `upload_history`

Append-only log of every upload event. Used for audit purposes. Never deleted.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated |
| `country` | `text` | `'canada'` or `'us'` |
| `uploaded_at` | `timestamptz` | When the upload occurred |
| `payments_count` | `integer` | Payment rows in that upload |
| `customers_count` | `integer` | Customer rows in that upload |

---

### `src/lib/supabase.js`

**What it does:** Creates and exports a single Supabase client instance shared by the entire application. Nothing else calls `createClient` directly — they all import `supabase` from this file.

```js
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Throws at module load time (not at runtime) if either the URL or key is missing, so a misconfigured environment fails loudly rather than silently producing empty API responses.

---

### `src/lib/supabaseService.js`

**What it does:** The only file (besides `supabase.js`) that calls the Supabase client directly. All other files that need database access import from here. This keeps all SQL/RPC logic in one place.

#### `saveSnapshot(country, payload)`

Saves processed data for one country. Always runs as a delete-then-insert to maintain the one-row-per-country invariant.

| Step | Operation | Fatal on failure? |
|---|---|---|
| 1 | `DELETE FROM dashboard_snapshots WHERE country = ?` | Yes — throws if delete fails |
| 2 | `INSERT INTO dashboard_snapshots (...)` | Yes — throws if insert fails |
| 3 | `INSERT INTO upload_history (...)` | No — logs a warning but does not throw |

Returns the inserted row on success.

#### `loadSnapshot(country)`

Loads the snapshot for a single country. Returns `null` if no row exists (Supabase error code `PGRST116` = no rows found) rather than throwing.

#### `loadAllSnapshots()`

Loads both countries in a single `SELECT *` query (no `WHERE` clause). Groups the results into `{ canada: row|null, us: row|null }`. More efficient than two separate `loadSnapshot` calls on page load.

#### `hasSnapshot(country)`

Lightweight metadata check — selects only `id`, `uploaded_at`, `payments_count`, `customers_count`. Returns `null` if no row exists. Used by `UploadPanel` to show the "current data" status without loading the full `joined_customers` JSONB array.

#### `loadUploadHistory()`

Returns the last 20 rows from `upload_history` ordered newest-first. Returns `[]` rather than throwing if the table is empty.

---

### `lib/analytics/join.js` — `prepareSavePayload`

Added at the bottom of the existing file without touching any existing code.

```js
export function prepareSavePayload(joinedCustomers, subscriberIds, payments, customers)
```

Takes the four pieces of data produced after a successful CSV join and packages them into the shape that `saveSnapshot` expects:

| Output field | Source | Notes |
|---|---|---|
| `joined_customers` | `joinedCustomers` | The full array of joined records |
| `subscriber_ids` | `Array.from(subscriberIds)` | Converts the `Set` to a plain array for JSON serialisation |
| `payments_count` | `payments.length` | Raw row count before any filtering |
| `customers_count` | `customers.length` | Raw row count before any filtering |
| `latest_payment_date` | Computed from `payments` | Iterates all payments, finds the largest `createdAt` Date, returns `.toISOString()` |

**`latest_payment_date` calculation:**

```js
const latestPayment = payments.reduce((latest, p) => {
  const d = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt)
  return d > latest ? d : latest
}, new Date(0))
```

Handles both `Date` objects and ISO strings in `p.createdAt` (defensive casting). Starts accumulator at epoch so the first payment always wins the first comparison. Returns `new Date(0).toISOString()` (epoch) if the payments array is empty.

---

### Store changes — `dashboardStore.js`

#### New state fields

| Field | Initial value | Purpose |
|---|---|---|
| `isLoadingFromSupabase` | `true` | `true` while the on-mount snapshot load is in progress |
| `supabaseError` | `null` | Stores the error message string if any Supabase call fails |
| `isSavingToSupabase` | `false` | `true` while a snapshot is being written after an upload |
| `savingCountry` | `null` | `'canada'` or `'us'` — which country is currently being saved |

#### New per-country state fields (added to `makeCountry`)

| Field | Purpose |
|---|---|
| `subscriberIds` | Array of customer ID strings where `isSubscriber === true` |
| `uploadedAt` | ISO timestamp of the most recent save for this country |
| `paymentsCount` | Number of payment rows in the uploaded file |
| `customersCount` | Number of customer rows in the uploaded file |
| `latestPaymentDate` | ISO timestamp of the most recent payment in the file |

#### On-mount `useEffect` — loading from Supabase

Runs once when `DashboardProvider` mounts. Calls `loadAllSnapshots()` and for each country that has a snapshot:

1. Runs `hydrateJoined()` to convert ISO date strings back to `Date` objects (see [Date hydration](#date-hydration-after-supabase-load)).
2. Creates a **synthetic payments array** containing a single entry at `latest_payment_date`:
   ```js
   [{ createdAt: new Date(snap.latest_payment_date) }]
   ```
   This entry is placed in `store.payments.data` so that `filterByDateRange` can compute the correct date window anchor even when no real CSV has been uploaded in this session.
3. Sets `isReady = true` if the joined array is non-empty.
4. Populates all metadata fields (`uploadedAt`, `paymentsCount`, etc.).

On any error, sets `supabaseError` and sets `isLoadingFromSupabase = false`. The dashboard shows whatever is in local state — which may be empty if no CSV was uploaded yet.

#### Upload flow — Supabase save

After `joinPaymentsAndCustomers` succeeds inside `uploadFile`:

1. A mutable `joinResult` variable captures the join output from inside the `setState` updater. This pattern works because: in production React calls updaters once; in development strict mode React calls them twice but both calls produce identical values so `joinResult` is always consistent.
2. `isSavingToSupabase` and `savingCountry` are set immediately.
3. `prepareSavePayload` is called with the joined data and the subscriber ID set derived from `joined.filter(c => c.isSubscriber).map(c => c.id)`.
4. `saveSnapshot` is called asynchronously.
5. On success: updates `uploadedAt`, `paymentsCount`, `customersCount`, `latestPaymentDate` in state; clears saving flags.
6. On failure: sets `supabaseError`; clears saving flags; **does not revert local state** — the admin can still view the dashboard locally.

---

### Fallback behavior when Supabase is unreachable

The dashboard is designed to degrade gracefully:

| Scenario | Behavior |
|---|---|
| `loadAllSnapshots` fails on mount | `supabaseError` is set; `isLoadingFromSupabase` is cleared; dashboard shows local state (may be empty) |
| `saveSnapshot` fails after upload | `supabaseError` is set; local state is kept; amber warning banner shown in both admin and dashboard; data viewable locally |
| Supabase is down mid-session | No calls are retried automatically; user must re-upload or refresh to retry |

No Supabase failure can crash the app or produce a blank white screen. All Supabase calls are wrapped in `try/catch`.

---

### Date hydration after Supabase load

JavaScript `Date` objects stored in the `joined_customers` JSONB column are serialised to ISO strings by `JSON.stringify`. When loaded back, they are plain strings. The `filterByDateRange` function compares `c.lastPayment >= cutoff` where `cutoff` is a `Date` — comparing a string to a `Date` in JavaScript coerces both to numbers but the string may not parse correctly in all engines.

The `hydrateJoined` function in `dashboardStore.js` converts these fields back to `Date` objects before setting state:

```js
function hydrateJoined(customers) {
  return customers.map(c => ({
    ...c,
    firstPayment: c.firstPayment ? new Date(c.firstPayment) : null,
    lastPayment:  c.lastPayment  ? new Date(c.lastPayment)  : null,
  }))
}
```

This runs on every snapshot load. All other fields (numbers, strings, booleans) require no conversion.

---

## Full Data Pipeline

```
── ADMIN UPLOAD PATH ──────────────────────────────────────────────────────────

CSV upload (payments)          CSV upload (customers)
        ↓                               ↓
  parsePayments()               parseCustomers()
        ↓                               ↓
        └──────── joinPaymentsAndCustomers() ──────────┘
                                ↓
                         store.joined[]
                                ↓
                   prepareSavePayload()
                                ↓
                      saveSnapshot()  ──────────────────→  Supabase
                                                           dashboard_snapshots
                                                           upload_history

── TEAM MEMBER / FRESH PAGE LOAD ──────────────────────────────────────────────

                          Supabase
                    dashboard_snapshots
                                ↓
                     loadAllSnapshots()
                                ↓
                     hydrateJoined()           ← converts ISO strings → Date objects
                                ↓
                  store.joined[]  +  synthetic payments[{ createdAt: latestPaymentDate }]

── DASHBOARD COMPUTATION (both paths merge here) ───────────────────────────────

                  filterByDateRange(joined, payments, days)
                                ↓
                        filteredCustomers[]
                         /              \
                filteredSubs[]      filteredNonSubs[]
                         \          |      /
                         viewCustomers[]          ← follows customerType toggle
                                ↓
                    computeKPIs()                 → KPIBooking, KPIHealth
                    computeBookingOutcomes()       → BookingOutcomes
                    computeBucketStats()           → BucketBarChart, LTVDonutChart
                                ↓
               allBucketStats / subBucketStats / nonBucketStats
                                ↓
                    AvgPercentileChart, BucketTable, HealthTable
```

---

## File-by-File Calculation Reference

---

### `lib/analytics/constants.js`

**What it does:** Single source of truth for all shared values — bucket labels, chart colors, keyword filter list, and the bucket classifier function. Every other file imports from here.

#### Exports

| Export | Value | Purpose |
|---|---|---|
| `BUCKETS` | `['1 booking', '2 bookings', '3 bookings', '4 bookings', '5+ bookings']` | Canonical bucket label order used as dictionary keys throughout |
| `BUCKET_COLORS` | 5 hex codes (dark blue → light blue → dark green → light green → orange) | Chart colors, index-matched to `BUCKETS` |
| `AVG_BOOKING_VALUE` | `225` | Assumed average booking value in dollars — exported but currently unused in any calculation |
| `NON_BOOKING_KEYWORDS` | `['tip', 'subscription creation', 'payment for invoice', 'fee', 'parking', 'change of service request']` | Any payment whose description contains one of these strings is excluded from booking counts |

#### `getBucket(bookingCount)`

Converts a raw booking count to a bucket label.

1. Calls `parseInt()` on the input — accepts both strings and numbers.
2. Compares the result to 1, 2, 3, 4 in order.
3. Any value ≥ 5 (or non-numeric due to `parseInt` returning `NaN`) falls through to `'5+ bookings'`.

> **Edge case:** `parseInt("NaN")` → `NaN`, which is not equal to 1–4, so corrupt values silently land in the `5+ bookings` bucket rather than crashing.

---

### `lib/analytics/parse.js` *(legacy)*

**What it does:** Parses the old single-CSV Canada export from Stripe. Not called by the active dashboard — kept for backward compatibility.

#### `parseCustomers(rawRows)`

**Filter — three independent gates (all must pass):**

| Gate | Condition | Reason |
|---|---|---|
| 1 | `!row.customer_id` → drop | Empty or header-artifact rows |
| 2 | `parseFloat(row.net_volume) <= 0` → drop | Full-refund customers — not real paying customers |
| 3 | `!row.last_payment` → drop | No date means date-range filtering is impossible |

**Field conversions:**

| Output field | Source | Conversion |
|---|---|---|
| `netVolume` | `row.net_volume` | `parseFloat()` |
| `grossVolume` | `row.gross_volume` | `parseFloat()` |
| `paymentCount` | `row.payment_count` | `parseInt()` |
| `refundVolume` | `row.refund_volume` | `parseFloat()` |
| `createdAt` / `firstPayment` / `lastPayment` | date string columns | `new Date()` |
| `bucket` | `row.payment_count` | `getBucket()` |

> **Edge case:** `parseFloat('')` returns `NaN`. `NaN <= 0` is `false`, so a blank `net_volume` cell passes the filter and produces `netVolume: NaN`, which will corrupt all downstream sums. See [Known Bugs](#known-bugs-and-edge-cases).

---

### `lib/analytics/filter.js`

**What it does:** Provides date-range filtering for both the old (single-CSV) and new (joined) data shapes. Both work on the same concept: keep only customers whose last booking falls within the last N days of the most recent transaction in the dataset.

#### Old API — `getLatestDate(customers)`

Iterates over all customers, comparing `c.lastPayment` Date objects. Starts the accumulator at `new Date(0)` (epoch) so the first customer always wins the first comparison. Returns the most recent `lastPayment` found.

#### Old API — `filterCustomers(customers, dateRange)`

1. `dateRange === 0` → returns all customers unchanged (All time).
2. Finds the anchor date via `getLatestDate`.
3. Subtracts `dateRange` days: `cutoff.setDate(cutoff.getDate() - dateRange)`.
4. Returns customers where `lastPayment >= cutoff` (inclusive of the cutoff day).

#### New API — `getLatestPaymentDate(payments)`

Same algorithm but operates on raw payment rows (`p.createdAt`) rather than joined customers. Anchoring to raw transactions is more accurate because a customer's `lastPayment` only reflects their last *booking*, while the raw payments include the most recent transaction of any type.

#### New API — `filterByDateRange(joinedCustomers, payments, days)`

Same logic as the old API but uses `getLatestPaymentDate(payments)` as the anchor.

> **Edge case:** An empty payments array returns `new Date(0)` from `getLatestPaymentDate`. The cutoff becomes 90 days before epoch — effectively a negative timestamp. Every customer passes `lastPayment >= (negative date)`, so an empty payments array behaves identically to `days = 0`.

> **Cross-country comparison caveat:** If Canada's file ends June 1 and US's ends April 1, "Last 90 days" means March–June for Canada and January–April for US. The labels are identical but the windows are different calendar periods.

---

### `lib/analytics/metrics.js`

**What it does:** The core arithmetic engine. Takes any array of customer records and computes all KPIs and per-bucket statistics. Works on both old (single-CSV) and new (joined) record shapes via duck-typed accessors.

#### Duck-typed accessors

```
getLTV   = c => c.net ?? c.netVolume ?? 0
getCount = c => c.bookingCount ?? c.paymentCount ?? 0
```

Tries the new field name first, falls back to the old field name, then defaults to 0.

#### Private helpers

| Helper | Calculation |
|---|---|
| `sum(arr)` | `arr.reduce((a, b) => a + b, 0)` — safe on empty arrays (initial value 0) |
| `avg(arr)` | `sum(arr) / arr.length`, or `0` if empty |

#### `computePercentile(arr, p)`

The most important single calculation in the codebase.

1. Guards against empty arrays — returns `0`.
2. Copies the array with `[...arr]` to avoid mutating the original, then sorts numerically ascending.
3. Computes a fractional index: `(p / 100) × (length − 1)`.
   - For P50 on 5 values: `0.5 × 4 = 2.0` → exact index 2.
   - For P50 on 4 values: `0.5 × 3 = 1.5` → interpolates between indices 1 and 2.
4. Takes `lo = Math.floor(idx)` and `hi = Math.ceil(idx)`.
5. If `lo === hi` (integer index): returns `sorted[lo]`.
6. Otherwise: linear interpolation: `sorted[lo] + (sorted[hi] − sorted[lo]) × fractional_part`.
7. Wraps in `Math.round()` — all percentile outputs are integers.

#### `computeKPIs(customers, percentile = 50, repeatThreshold = 2)`

| Output | Calculation |
|---|---|
| `totalCustomers` | `customers.length` |
| `totalLTV` | `sum(customers.map(getLTV))` |
| `avgLTV` | `totalLTV / totalCustomers` (0 if empty) |
| `percentileLTV` | `computePercentile(ltvs, percentile)` — follows the slider |
| `medianLTV` | `computePercentile(ltvs, 50)` — always P50 regardless of slider |
| `repeatCount` | Count of customers where `getCount(c) >= repeatThreshold` |
| `repeatRate` | `(repeatCount / totalCustomers) × 100` (0 if no customers) |
| `gross` | `sum(c.gross)` — total revenue before refunds |
| `refunded` | `sum(c.refunded)` — total refund volume |
| `disputeLosses` | `sum(c.disputeLosses)` |
| `refundRate` | `(refunded + disputeLosses) / gross × 100` (disputes count as lost revenue equal to refunds) |
| `net` | Alias for `totalLTV` |

> **Note:** `medianLTV` is computed and exported but no component currently displays it.

#### `computeBucketStats(customers, percentile = 50)`

Runs the same arithmetic as `computeKPIs` but once per bucket. Iterates over the five canonical `BUCKETS` labels in order, filters customers to the matching bucket, then computes all fields. Additionally computes:

| Extra output | Calculation |
|---|---|
| `subscriberCount` | Count of customers in this bucket where `c.isSubscriber === true` |
| `nonSubscriberCount` | `group.length - subscriberCount` |

Returns an array of exactly 5 objects, one per bucket. Buckets with zero customers return all-zero values (no crashes).

---

### `src/hooks/useDashboard.js`

**What it does:** The central orchestration hook. Pulls raw data from the global store, applies filtering and computation, manages all UI control state, and exposes a single object consumed by the dashboard page.

#### State managed

| State variable | Default | Purpose |
|---|---|---|
| `country` | `'canada'` | Which country's data to display |
| `dateRange` | `90` | Days to look back; `0` = all time |
| `customerType` | `'all'` | Segment toggle: `'all'` / `'sub'` / `'non'` |
| `rawPercentile` | `50` | Slider visual position — updates on every drag event |
| `rawRepeatThreshold` | `2` | Slider visual position — updates on every drag event |
| `percentile` | `50` | Debounced value — drives all calculations |
| `repeatThreshold` | `2` | Debounced value — drives all calculations |
| `isComputing` | `false` | True during the 150ms debounce window |

#### Debounce mechanism

A `useEffect` fires whenever `rawPercentile` or `rawRepeatThreshold` changes:

1. A `isMounted` ref starts `false`. On first render the effect returns early — no spinner appears on page load.
2. After first render, any slider movement immediately sets `isComputing = true`.
3. A 150ms `setTimeout` is scheduled. When it fires, it commits the new `percentile` / `repeatThreshold` and clears `isComputing`.
4. If the slider moves again before 150ms, the cleanup function cancels the pending timeout and a new one is scheduled. Calculations only run 150ms after the user's last drag movement.

#### Memoized derivations (in dependency order)

| Value | Inputs | Calculation |
|---|---|---|
| `filteredCustomers` | `store.joined`, `payments`, `dateRange` | `filterByDateRange(store.joined, payments, dateRange)` |
| `filteredSubs` | `filteredCustomers` | Filter to `c.isSubscriber === true` |
| `filteredNonSubs` | `filteredCustomers` | Filter to `c.isSubscriber` falsy |
| `viewCustomers` | All three above + `customerType` | Selects one of the three filtered lists based on the toggle |
| `kpis` | `viewCustomers`, `percentile`, `repeatThreshold` | `computeKPIs(viewCustomers, percentile, repeatThreshold)` |
| `bucketStats` | `viewCustomers`, `percentile` | `computeBucketStats(viewCustomers, percentile)` |
| `bookingOutcomes` | `viewCustomers` | `computeBookingOutcomes(viewCustomers)` |
| `allBucketStats` | `filteredCustomers`, `percentile` | `computeBucketStats(filteredCustomers, percentile)` — always all customers, ignores the toggle |
| `subBucketStats` | `filteredSubs`, `percentile` | `computeBucketStats(filteredSubs, percentile)` |
| `nonBucketStats` | `filteredNonSubs`, `percentile` | `computeBucketStats(filteredNonSubs, percentile)` |

> **Design note:** `kpis` and `bucketStats` follow the `customerType` toggle (they use `viewCustomers`). `allBucketStats` / `subBucketStats` / `nonBucketStats` do not — they always show all three segments regardless of the toggle, because `AvgPercentileChart` and `BucketTable` display all three side-by-side.

---

### `src/app/page.js`

**What it does:** The root route (`/`). A Client Component that calls `useDashboard()`, renders the full dashboard layout, and passes all computed data to child components. Contains almost no arithmetic of its own.

#### The only calculation in this file

**`repeatBadge`:**
```
rawRepeatThreshold === 1 ? '1+ booking' : `${rawRepeatThreshold}+ bookings`
```
Grammatical label for the slider badge. Uses the raw (instant) value so the label always matches the slider position even during the debounce window.

#### Gate: `if (!isReady)`

If `store.isReady` is `false` (no data uploaded for the selected country), the entire chart area is replaced with a "No data loaded yet" message. No calculations run.

#### `isComputing` opacity

The wrapper `<div>` around all charts gets `opacity-60` during `isComputing`. Visual feedback only — no arithmetic.

---

### `src/app/components/dashboard/KPIStrip.jsx` *(dead code)*

> **Status: Not used.** `src/app/page.js` imports `KPIBooking` and `KPIHealth` instead. This file is the original single-country 5-card strip from before the architecture rebuild. It is never imported by anything active.

#### Formatting functions

| Function | Input | Calculation | Example |
|---|---|---|---|
| `fmt(n)` | Any number | `'$' + Math.round(n).toLocaleString()` | `fmt(1234.7)` → `"$1,235"` |
| `fmtK(n)` | `n >= 1,000,000` | Divide by 1,000,000, one decimal, append `"m"` | `fmtK(1500000)` → `"$1.5m"` |
| `fmtK(n)` | `n >= 1,000` | Divide by 1,000, zero decimals, append `"k"` | `fmtK(2300)` → `"$2k"` |
| `fmtK(n)` | `n < 1,000` | Falls through to `fmt(n)` | `fmtK(500)` → `"$500"` |

> **Edge case:** `fmtK(999999)` → `"$1000k"` because `999999 / 1000 = 999.999`, which rounds to `"1000"`. Numbers just below $1M display as `"$1000k"` rather than `"$1.0m"`.

#### Display labels

| Label | Calculation |
|---|---|
| `rangLabel` | `dateRange === 0 ? 'All time' : 'Last ${dateRange} days'` |
| `repeatLabel` | `repeatThreshold === 1 ? '1+ booking' : '${repeatThreshold}+ bookings'` |

---

### `src/app/components/dashboard/BucketBarChart.jsx`

**What it does:** Vertical bar chart — one bar per bucket showing customer count. Each bar is colored with the bucket's canonical color.

This component performs **no calculations**. It receives `bucketStats` (already computed) and passes values to Recharts.

#### Display-only transforms

| Transform | Code | Purpose |
|---|---|---|
| Y-axis labels | `v => v.toLocaleString()` | Adds locale thousand separators to tick labels |
| Tooltip | `payload[0].value.toLocaleString() + ' customers'` | Same formatting for hover tooltip |
| Bar color | `BUCKET_COLORS[i]` | Index-matched to bucket order |

---

### `src/app/components/dashboard/LTVDonutChart.jsx`

**What it does:** Donut (ring) pie chart showing each bucket's share of total lifetime value. Displays the total LTV figure in the center hole.

#### Calculations

**Total LTV:**
```
totalLTV = bucketStats.reduce((a, b) => a + b.totalLTV, 0)
```
Sums `totalLTV` from all 5 bucket stats. Should equal `kpis.totalLTV` when both operate on the same customer set.

**Percentage per slice:**
```
totalLTV > 0 ? parseFloat((b.totalLTV / totalLTV * 100).toFixed(1)) : 0
```
1. Divides bucket's `totalLTV` by grand total.
2. Multiplies by 100.
3. `.toFixed(1)` rounds to one decimal place and produces a string (`"34.7"`).
4. `parseFloat()` converts back to a number (`34.7`) for Recharts.
5. Guards against division by zero when `totalLTV === 0`.

**Center label:**
```
totalLTV >= 1,000,000 → '$' + (totalLTV / 1,000,000).toFixed(1) + 'm'
else                  → '$' + (totalLTV / 1,000).toFixed(0) + 'k'
```

> **Edge case:** The `< 1,000` case is missing. If `totalLTV < 1000`, the else branch divides by 1,000 and rounds, producing `"$1k"` for a total of $500. Unlikely in production but will appear on small test datasets.

---

### `src/app/components/dashboard/AvgMedianChart.jsx` *(dead code)*

> **Status: Not used.** `src/app/page.js` imports `AvgPercentileChart` instead, which is the 4-series evolution of this component. This file is never imported by anything active.

**What it does (when active):** Two bars per bucket — average LTV and percentile LTV — to show how much the mean is pulled by outliers.

#### Data transformation

```js
data = bucketStats.map(b => ({
  bucket: b.bucket,
  'Avg LTV': Math.round(b.avgLTV),
  [pLabel]: Math.round(b.percentileLTV),   // pLabel = `P${percentile} LTV`
}))
```

`Math.round()` on both values for clean integer display. The dynamic key `[pLabel]` means the legend and tooltip update when the slider moves.

---

### `src/app/components/dashboard/BucketTable.jsx`

**What it does:** A tabbed data table with three tabs (All / Subscribers / Non-subscribers). Each tab shows per-bucket statistics. The Total LTV column also renders a horizontal progress bar proportional to the highest-LTV bucket.

#### Calculations

**Tab selection:**
```js
const bucketStats = statsMap[tab] ?? allBucketStats
```
Dictionary lookup — `'all'` → `allBucketStats`, `'sub'` → `subBucketStats`, `'non'` → `nonBucketStats`. Falls back to `allBucketStats` if the key is invalid.

**`maxLTV` (progress bar denominator):**
```js
Math.max(...bucketStats.map(b => b.totalLTV), 0)
```
Spreads all `totalLTV` values into `Math.max`. The `0` argument ensures the result is never negative. The bucket with the highest revenue gets a 100% wide bar; all others are proportionally smaller.

**Progress bar width (`InlineBar`):**
```js
pct = max > 0 ? (value / max) * 100 : 0
```
Divides the bucket's `totalLTV` by `maxLTV`, multiplies by 100 to produce a CSS percentage. Guards against `max === 0`.

**`fmt(n)`:**
```
'$' + Math.round(n).toLocaleString()
```
Same as `KPIStrip.fmt`.

**P{n} column header:**
Displays `P{percentile}` using the `percentile` prop. Updates reactively when the debounced slider value settles.

> **Design note:** The tab inside `BucketTable` is local state, independent of the `customerType` toggle in the top bar. A user can have "Subscribers" selected in the top bar while viewing the "Non-subscribers" tab in this table simultaneously — the two sections of the page will show different segments with no warning.

---

## What Is Not Calculated Yet

| Missing metric | Data available | Notes |
|---|---|---|
| `AVG_BOOKING_VALUE` usage | Constant exists (`$225`) | Exported but used in zero calculations — appears intended for estimated-revenue projections |
| Cohort retention / churn rate | `firstPayment` + `lastPayment` per customer | Could show % of customers who return within 30/60/90 days, or how long customers stay active |
| Time-series breakdown | All payments have `createdAt` | Revenue by month or quarter is not computed — only a flat date-range window |
| Subscriber vs non-subscriber revenue comparison | `isSubscriber` flag | Bucket-level breakdown exists in tabs, but no single top-level KPI compares the two |
| Projected LTV | `bookingCount` + `AVG_BOOKING_VALUE` | Extrapolation of how much a 2-booking customer is likely to spend over their lifetime |
| Geographic breakdown | `city` and `country` fields on every joined record | Fields are stored but never surfaced on the dashboard |
| `medianLTV` display | Computed by `computeKPIs` | Returned in the KPI object but no component renders it |

---

## Known Bugs and Edge Cases

### 1. `parseFloat('')` passes the net volume filter in `parse.js`

`parseFloat('')` returns `NaN`. `NaN <= 0` evaluates to `false` in JavaScript, so a CSV row with a blank `net_volume` field is not filtered out. The resulting record has `netVolume: NaN`. Any arithmetic on `NaN` propagates `NaN`, which Recharts silently renders as a missing/zero bar. This only affects the legacy single-CSV parser.

---

### 2. `LTVDonutChart` center label breaks below $1,000

The center label only handles `>= 1,000,000` and the else branch divides by 1,000:

```
totalLTV = 500  →  500 / 1000 = 0.5  →  toFixed(0) = "1"  →  displays "$1k"
```

Numbers below $1,000 show an incorrect label. Unlikely in production but visible on small test datasets.

---

### 3. `BucketTable` tab is independent of the top-bar segment toggle

The `tab` state inside `BucketTable` is local React state. It does not reset when the top-bar `customerType` toggle changes. Result: the KPI strip and the table can simultaneously show different customer segments (e.g. KPIs showing "Subscribers" while the table shows "Non-subscribers") with no visual indication that this is happening.

---

### 4. Date windows are not aligned between Canada and US

`filterByDateRange` anchors the date window to the most recent payment in each country's `payments.data`. If Canada's file ends June 1 and US's ends April 1, selecting "Last 90 days" produces:

- Canada: March 3 – June 1
- US: January 1 – April 1

The metric labels say "Last 90 days" for both, making cross-country comparison misleading.

---

### 5. Empty US data shows as zeros, not an error

`isSubscriber` and all join fields are only set during `joinPaymentsAndCustomers`. If either the payments or customers file for a country was not uploaded, `store.joined` is `[]`. All charts render empty/zero rather than showing an error state. The "Subscribers" tab in `BucketTable` and the "Sub — Avg" bar in `AvgPercentileChart` both show zeros, which can be misread as "no subscribers" rather than "data not loaded."

---

### 6. `Math.max(...largeArray)` call stack risk

`Math.max(...bucketStats.map(...))` spreads the array as function arguments. For arrays with more than ~100,000 elements, JavaScript throws "Maximum call stack size exceeded." In practice `bucketStats` always has exactly 5 elements so this is not a real risk, but the pattern would be unsafe if buckets ever became dynamic.
