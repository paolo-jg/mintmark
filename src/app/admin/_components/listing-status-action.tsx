'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function ListingStatusAction({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [loading, setLoading] = useState(false)

  async function updateStatus(status: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Listing ${status}`)
      window.location.reload()
    } catch {
      toast.error('Failed to update listing')
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus === 'active') {
    return (
      <button
        onClick={() => updateStatus('expired')}
        disabled={loading}
        className="text-xs px-2.5 py-1 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 disabled:opacity-50"
      >
        Remove
      </button>
    )
  }

  if (currentStatus === 'expired' || currentStatus === 'draft') {
    return (
      <button
        onClick={() => updateStatus('active')}
        disabled={loading}
        className="text-xs px-2.5 py-1 border border-green-200 dark:border-green-900 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 disabled:opacity-50"
      >
        Activate
      </button>
    )
  }

  return null
}
