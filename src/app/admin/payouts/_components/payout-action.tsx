'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  orderId: string
  status: string
  sellerStripeReady: boolean
  transferReleased: boolean
  hasPayout: boolean
}

export default function PayoutAction({ orderId, status, sellerStripeReady, transferReleased, hasPayout }: Props) {
  const [loading, setLoading] = useState<'release' | 'refund' | null>(null)

  async function act(action: 'release' | 'refund') {
    if (!confirm(action === 'release'
      ? 'Release funds to seller? This cannot be undone.'
      : 'Refund buyer? This cannot be undone.'
    )) return

    setLoading(action)
    try {
      const res = await fetch(`/api/admin/payouts/${orderId}/${action}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      toast.success(action === 'release' ? 'Funds released to seller' : 'Buyer refunded')
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  if (transferReleased) return <span className="text-xs text-zinc-400">Done</span>

  return (
    <div className="flex items-center justify-end gap-2">
      {hasPayout && sellerStripeReady && (
        <button
          onClick={() => act('release')}
          disabled={!!loading}
          className="text-xs px-2.5 py-1 border border-green-200 dark:border-green-900 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-700 dark:text-green-400 disabled:opacity-50"
        >
          {loading === 'release' ? 'Releasing…' : 'Release to Seller'}
        </button>
      )}
      {status === 'disputed' && (
        <button
          onClick={() => act('refund')}
          disabled={!!loading}
          className="text-xs px-2.5 py-1 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 disabled:opacity-50"
        >
          {loading === 'refund' ? 'Refunding…' : 'Refund Buyer'}
        </button>
      )}
    </div>
  )
}
