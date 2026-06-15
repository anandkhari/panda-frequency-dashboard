'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loadLatestSnapshot } from '@/lib/supabaseService'

export default function ViewLatestPage() {
  const router = useRouter()

  useEffect(() => {
    loadLatestSnapshot()
      .then(snap => {
        if (snap) {
          router.push('/view/' + snap.slug)
        } else {
          router.push('/')
        }
      })
      .catch(() => router.push('/'))
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
