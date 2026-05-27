'use client'

import { useState } from 'react'
import { X, Loader2, Gavel, AlertTriangle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { toast } from 'sonner'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  auctionId: string
  currentBid: number
  endTime: string
  onClose: () => void
  onBidPlaced: (newBid: number, newEndTime: string, bidCount: number) => void
}

export function BidModal({ auctionId, currentBid, endTime, onClose, onBidPlaced }: Props) {
  const minBid = currentBid + 100
  const [dollars, setDollars] = useState((minBid / 100).toFixed(2))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCardSetup, setShowCardSetup] = useState(false)
  const [settingUpCard, setSettingUpCard] = useState(false)

  const amountCents = Math.round(parseFloat(dollars || '0') * 100)
  const tooLow = amountCents < minBid

  const msLeft = new Date(endTime).getTime() - Date.now()
  const finalSeconds = msLeft > 0 && msLeft < 60_000 ? Math.floor(msLeft / 1000) : null

  async function setupCard() {
    setSettingUpCard(true)
    try {
      const res = await fetch('/api/stripe/setup', { method: 'POST' })
      const { client_secret } = await res.json()
      if (!client_secret) throw new Error('Failed to initialize card setup')

      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe not loaded')

      const { error: stripeError } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: { token: '' } as never, // placeholder — triggers Stripe's hosted card input
        },
      })

      if (stripeError) throw new Error(stripeError.message)
      toast.success('Card saved — you can now place your bid')
      setShowCardSetup(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Card setup failed')
    } finally {
      setSettingUpCard(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tooLow || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auctionId, amount: amountCents }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (json.error === 'no_payment_method') {
          setShowCardSetup(true)
          setSubmitting(false)
          return
        }
        setError(json.error ?? 'Failed to place bid')
        setSubmitting(false)
        return
      }

      const { bid_placed, end_time, bid_count, sniped } = json.data

      if (sniped) {
        toast.success('Bid placed — auction extended to 15 seconds!', {
          description: 'Your bid triggered anti-sniping protection.',
        })
      } else {
        toast.success(`Bid of ${formatCents(bid_placed)} placed!`)
      }

      onBidPlaced(bid_placed, end_time, bid_count)
      onClose()
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  if (showCardSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Add a Payment Method</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            A payment authorization hold will be placed on your card for your bid amount. The hold is released if you're outbid, and captured only if you win.
          </p>
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            You'll be redirected to securely enter your card details via Stripe.
          </p>
          <div className="flex gap-2.5 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowCardSetup(false)}>
              Back
            </Button>
            <Button className="flex-1" onClick={setupCard} disabled={settingUpCard}>
              {settingUpCard ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Setting up…</> : 'Add Card'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border border-border">

        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Place a Bid</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current bid</span>
              <span className="font-semibold tabular-nums">{formatCents(currentBid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Minimum bid</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCents(minBid)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5">
            <CreditCard className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Bidding places an authorization hold on your saved card. Released if outbid, captured if you win.
            </p>
          </div>

          {finalSeconds !== null && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-400/40 bg-red-50/60 dark:bg-red-950/20 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                Only <strong>{finalSeconds}s</strong> left! Bidding now will reset the auction to 15 seconds.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">Your bid (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
              <input
                type="number"
                step="0.01"
                min={(minBid / 100).toFixed(2)}
                value={dollars}
                onChange={e => setDollars(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring tabular-nums"
                autoFocus
              />
            </div>
            {tooLow && dollars !== '' && (
              <p className="text-xs text-destructive mt-1.5">Must be at least {formatCents(minBid)}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2.5 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || tooLow || !dollars}>
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Bidding…</>
                : `Bid ${amountCents >= minBid ? formatCents(amountCents) : '–'}`
              }
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
