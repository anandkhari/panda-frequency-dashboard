'use client'

import { useRouter } from 'next/navigation'
import UploadPanel from '@/components/admin/UploadPanel'

export default function AdminPage() {
  const router = useRouter()
  return <UploadPanel onAllReady={() => router.push('/dashboard')} />
}
