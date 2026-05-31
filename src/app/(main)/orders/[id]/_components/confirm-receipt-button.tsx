'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  orderId: string
  autoConfirmAt: string | null
  onConfirmed: (newAutoConfirmAt: string) => void
}

export function ConfirmReceiptButton({ orderId, autoConfirmAt, onConfirmed }: Props) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to confirm receipt')
        return
      }
      setConfirmed(true)
      onConfirmed(data.auto_confirm_at)
      toast.success('Receipt confirmed. Payout releases to seller in 48 hours.')
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Receipt confirmed
      </div>
    )
  }

  const autoDate = autoConfirmAt ? new Date(autoConfirmAt) : null

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Did your coin arrive in the expected condition?</p>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
          Confirming starts a <strong>48-hour dispute window</strong> before payment is released to the seller.
          {autoDate && (
            <> If you don't confirm, payment releases automatically on <strong>{autoDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</strong>.</>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleConfirm} disabled={loading} className="flex-1">
          {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Confirming…</> : 'Yes, I received it'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Have a problem? File a dispute below <strong>before</strong> confirming receipt.
      </p>
    </div>
  )
}
