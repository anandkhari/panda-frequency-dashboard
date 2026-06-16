'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useDashboardStore } from '@/store/dashboardStore'
import { filterByDateRange } from '@/lib/analytics/filter'
import { computeKPIs, computeBucketStats } from '@/lib/analytics/metrics'
import { computeBookingOutcomes } from '@/lib/analytics/bookingOutcomes'

export function useDashboard() {
  const {
    canada,
    us,
    isLoadingFromSupabase,
    supabaseError,
    setSupabaseError,
    isSavingToSupabase,
    savingCountry,
  } = useDashboardStore()

  const [country, setCountry] = useState('canada')
  const [dateRange, setDateRange] = useState(90)
  const [customerType, setCustomerType] = useState('all') // 'all' | 'sub' | 'non'

  // Slider display values (instant)
  const [rawPercentile, setRawPercentile] = useState(50)
  const [rawRepeatThreshold, setRawRepeatThreshold] = useState(2)

  // Debounced values (drive computations)
  const [percentile, setPercentile] = useState(50)
  const [repeatThreshold, setRepeatThreshold] = useState(2)
  const [isComputing, setIsComputing] = useState(false)

  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    setIsComputing(true)
    const timer = setTimeout(() => {
      setPercentile(rawPercentile)
      setRepeatThreshold(rawRepeatThreshold)
      setIsComputing(false)
    }, 150)
    return () => clearTimeout(timer)
  }, [rawPercentile, rawRepeatThreshold])

  const store = country === 'canada' ? canada : us
  const payments = store.payments.data

  // Date-range filtered customers (all types)
  const filteredCustomers = useMemo(() =>
    filterByDateRange(store.joined, payments, dateRange),
    [store.joined, payments, dateRange]
  )

  const filteredSubs = useMemo(() =>
    filteredCustomers.filter(c => c.isSubscriber),
    [filteredCustomers]
  )

  const filteredNonSubs = useMemo(() =>
    filteredCustomers.filter(c => !c.isSubscriber),
    [filteredCustomers]
  )

  // Active view (follows customerType toggle)
  const viewCustomers = useMemo(() => {
    if (customerType === 'sub') return filteredSubs
    if (customerType === 'non') return filteredNonSubs
    return filteredCustomers
  }, [filteredCustomers, filteredSubs, filteredNonSubs, customerType])

  // KPIs and outcomes follow the active view
  const kpis = useMemo(() =>
    computeKPIs(viewCustomers, percentile, repeatThreshold),
    [viewCustomers, percentile, repeatThreshold]
  )

  const bucketStats = useMemo(() =>
    computeBucketStats(viewCustomers, percentile),
    [viewCustomers, percentile]
  )

  const bookingOutcomes = useMemo(() =>
    computeBookingOutcomes(viewCustomers),
    [viewCustomers]
  )

  // All-three bucket stat sets for AvgPercentileChart and BucketTable tabs
  const allBucketStats = useMemo(() =>
    computeBucketStats(filteredCustomers, percentile),
    [filteredCustomers, percentile]
  )

  const subBucketStats = useMemo(() =>
    computeBucketStats(filteredSubs, percentile),
    [filteredSubs, percentile]
  )

  const nonBucketStats = useMemo(() =>
    computeBucketStats(filteredNonSubs, percentile),
    [filteredNonSubs, percentile]
  )

  return {
    // country
    country,
    setCountry,
    // readiness
    isReady: store.isReady,
    canadaReady: canada.isReady,
    usReady: us.isReady,
    // supabase state
    isLoadingFromSupabase,
    supabaseError,
    setSupabaseError,
    isSavingToSupabase,
    savingCountry,
    // metadata for the current country
    uploadedAt: store.uploadedAt,
    paymentsCount: store.paymentsCount ?? 0,
    subscriberCount: store.subscriberIds?.length ?? 0,
    dateRange,
    setDateRange,
    customerType,
    setCustomerType,
    rawPercentile,
    setRawPercentile,
    rawRepeatThreshold,
    setRawRepeatThreshold,
    percentile,
    repeatThreshold,
    isComputing,
    // computed data
    filteredCustomers,
    viewCustomers,
    kpis,
    bucketStats,
    bookingOutcomes,
    allBucketStats,
    subBucketStats,
    nonBucketStats,
  }
}
