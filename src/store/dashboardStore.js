'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import Papa from 'papaparse'
import { parsePayments } from '@/lib/analytics/parsePayments'
import { parseCustomers } from '@/lib/analytics/parseCustomers'
import { joinPaymentsAndCustomers, prepareSavePayload } from '@/lib/analytics/join'
import { loadAllSnapshots, saveSnapshot } from '@/lib/supabaseService'

const PAYMENT_REQUIRED = [
  'Customer ID', 'Amount', 'Amount Refunded',
  'Status', 'Description', 'Created date (UTC)', 'Invoice ID',
]
const CUSTOMER_REQUIRED = [
  'id', 'Total Spend', 'Payment Count',
  'Refunded Volume', 'Dispute Losses', 'firebaseUid (metadata)',
]

function hasRequiredCols(headers, required) {
  return required.every(col => headers.includes(col))
}

function makeFile() {
  return { data: [], isLoaded: false, isLoading: false, error: null, fileName: null }
}

function makeCountry() {
  return {
    payments: makeFile(),
    customers: makeFile(),
    joined: [],
    subscriberIds: [],
    isReady: false,
    // metadata populated from Supabase or after a local upload
    uploadedAt: null,
    paymentsCount: null,
    customersCount: null,
    latestPaymentDate: null,
  }
}

// Convert ISO date strings from JSON back to Date objects so filter comparisons work.
function hydrateJoined(customers) {
  if (!customers || !customers.length) return []
  return customers.map(c => ({
    ...c,
    firstPayment: c.firstPayment ? new Date(c.firstPayment) : null,
    lastPayment: c.lastPayment ? new Date(c.lastPayment) : null,
  }))
}

const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const [canada, setCanada] = useState(makeCountry)
  const [us, setUs] = useState(makeCountry)

  // Global Supabase state
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(true)
  const [supabaseError, setSupabaseError] = useState(null)
  const [isSavingToSupabase, setIsSavingToSupabase] = useState(false)
  const [savingCountry, setSavingCountry] = useState(null)
  const setSaveError = setSupabaseError

  // Load existing snapshots from Supabase on mount
  useEffect(() => {
    async function load() {
      try {
        const snapshots = await loadAllSnapshots()

        if (snapshots.canada) {
          const snap = snapshots.canada
          const joined = hydrateJoined(snap.joined_customers)
          // Synthetic payments array so filterByDateRange can anchor the date window
          const syntheticPayments = snap.latest_payment_date
            ? [{ createdAt: new Date(snap.latest_payment_date) }]
            : []

          setCanada(prev => ({
            ...prev,
            payments: { ...prev.payments, data: syntheticPayments },
            joined,
            subscriberIds: snap.subscriber_ids || [],
            isReady: joined.length > 0,
            uploadedAt: snap.uploaded_at,
            paymentsCount: snap.payments_count,
            customersCount: snap.customers_count,
            latestPaymentDate: snap.latest_payment_date,
          }))
        }

        if (snapshots.us) {
          const snap = snapshots.us
          const joined = hydrateJoined(snap.joined_customers)
          const syntheticPayments = snap.latest_payment_date
            ? [{ createdAt: new Date(snap.latest_payment_date) }]
            : []

          setUs(prev => ({
            ...prev,
            payments: { ...prev.payments, data: syntheticPayments },
            joined,
            subscriberIds: snap.subscriber_ids || [],
            isReady: joined.length > 0,
            uploadedAt: snap.uploaded_at,
            paymentsCount: snap.payments_count,
            customersCount: snap.customers_count,
            latestPaymentDate: snap.latest_payment_date,
          }))
        }
      } catch (err) {
        setSupabaseError(err.message)
      } finally {
        setIsLoadingFromSupabase(false)
      }
    }

    load()
  }, [])

  const setCountryData = useCallback(async (countryKey, payload) => {
    console.log('setCountryData called for:', countryKey)

    if (!payload.joined_customers?.length) {
      return
    }

    const setCountry = countryKey === 'canada' ? setCanada : setUs

    console.log('calling saveSnapshot for:', countryKey)
    setIsSavingToSupabase(true)
    setSavingCountry(countryKey)

    try {
      await saveSnapshot(countryKey, payload)
      console.log('saveSnapshot success for:', countryKey)

      const now = new Date().toISOString()
      setCountry(prev => ({
        ...prev,
        uploadedAt: now,
        paymentsCount: payload.payments_count,
        customersCount: payload.customers_count,
        latestPaymentDate: payload.latest_payment_date,
      }))
    } catch (err) {
      console.error('saveSnapshot failed:', err.message)
      setSaveError(err.message)
    } finally {
      setIsSavingToSupabase(false)
      setSavingCountry(null)
    }
  }, [setCanada, setUs, setIsSavingToSupabase, setSavingCountry, setSaveError])

  const uploadFile = useCallback((countryKey, type, file) => {
    const currentCountry = countryKey === 'canada' ? canada : us
    const set = countryKey === 'canada' ? setCanada : setUs

    set(prev => ({
      ...prev,
      [type]: { ...prev[type], isLoading: true, error: null },
    }))

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? []
        const required = type === 'payments' ? PAYMENT_REQUIRED : CUSTOMER_REQUIRED

        if (!hasRequiredCols(headers, required)) {
          set(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              isLoading: false,
              error: `Wrong file. This doesn't look like a ${type} CSV.`,
            },
          }))
          return
        }

        const parsed = type === 'payments'
          ? parsePayments(results.data)
          : parseCustomers(results.data)

        const updatedSlot = {
          data: parsed,
          isLoaded: true,
          isLoading: false,
          error: null,
          fileName: file.name,
        }

        set(prev => {
          const updated = { ...prev, [type]: updatedSlot }

          return updated
        })

        const payments = type === 'payments' ? parsed : currentCountry.payments.data
        const customers = type === 'customers' ? parsed : currentCountry.customers.data

        if (payments.length > 0 && customers.length > 0) {
          const joined = joinPaymentsAndCustomers(payments, customers)
          const newSubscriberIds = joined
            .filter(c => c.isSubscriber)
            .map(c => c.id)

          set(prev => ({
            ...prev,
            [type]: updatedSlot,
            joined,
            subscriberIds: newSubscriberIds,
            isReady: true,
          }))

          const payload = prepareSavePayload(joined, newSubscriberIds, payments, customers)
          void setCountryData(countryKey, payload)
        }
      },
      error: () => {
        set(prev => ({
          ...prev,
          [type]: { ...prev[type], isLoading: false, error: 'Failed to read file.' },
        }))
      },
    })
  }, [canada, us, setCountryData])

  return (
    <DashboardContext.Provider value={{
      canada,
      us,
      uploadFile,
      isLoadingFromSupabase,
      supabaseError,
      setSupabaseError,
      isSavingToSupabase,
      savingCountry,
      setSaveError,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardStore() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboardStore must be used within DashboardProvider')
  return ctx
}
