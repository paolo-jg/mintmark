'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCents } from '@/lib/utils'

interface Props {
  listing: {
    id: string
    price: number | null
    coin_name: string | null
  }
  onClose: () => void
  onSuccess: () => void
}

export function MakeOfferModal({ listing, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function parseCents(val: string): number {
    return Math.round(parseFloat(val.replace(/[^0-9.]/g, '')) * 100) || 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = parseCents(amount)
    if (amountCents <= 0) {
      toast.error('Enter a valid offer amount')
      return
    }
    if (listing.price && amountCents >= listing.price) {
      toast.error('Your offer is at or above the asking price - just buy it now')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, amountCents, message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to submit offer')
      toast.success('Offer sent!')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit offer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold">Make an Offer</h2>
            {listing.coin_name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{listing.coin_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {listing.price && (
          <p className="text-xs text-muted-foreground mb-4">
            Asking price: <span className="font-semibold text-foreground">{formatCents(listing.price)}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5">Your Offer</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">
              Message <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a note to the seller..."
              rows={2}
              maxLength={300}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Offers expire in 48 hours. The seller can accept, decline, or counter.
          </p>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Offer'}
          </Button>
        </form>
      </div>
    </div>
  )
}
