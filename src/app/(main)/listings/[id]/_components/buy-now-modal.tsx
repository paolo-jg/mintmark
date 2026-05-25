'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatCents } from '@/lib/utils'

function calcConvenienceFee(priceUsd: number): number {
  return (priceUsd * 0.029 + 0.30) / (1 - 0.029) + 0.30
}

interface Props {
  listing: {
    id: string
    price: number | null
    coin_name: string | null
    pass_convenience_fee: boolean
  }
  onClose: () => void
}

export function BuyNowModal({ listing, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false)

  const [shipToName, setShipToName] = useState('')
  const [shipToStreet1, setShipToStreet1] = useState('')
  const [shipToStreet2, setShipToStreet2] = useState('')
  const [shipToCity, setShipToCity] = useState('')
  const [shipToState, setShipToState] = useState('')
  const [shipToZip, setShipToZip] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shipToName.trim() || !shipToStreet1.trim() || !shipToCity.trim() || !shipToState.trim() || !shipToZip.trim()) {
      toast.error('Please fill in all required shipping fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          ship_to_name: shipToName.trim(),
          ship_to_street1: shipToStreet1.trim(),
          ship_to_street2: shipToStreet2.trim() || undefined,
          ship_to_city: shipToCity.trim(),
          ship_to_state: shipToState.trim().toUpperCase(),
          ship_to_zip: shipToZip.trim(),
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        setSubmitting(false)
        return
      }
      // Redirect to Stripe-hosted checkout page
      window.location.href = json.url
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-md border border-border flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-bold">Confirm Purchase</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {/* Coin summary */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 mb-6">
            <p className="text-sm font-semibold">{listing.coin_name ?? 'Coin'}</p>
            {listing.price != null && (() => {
              const priceUsd = listing.price / 100
              const buyerFeeCents = Math.round(listing.price * 0.05)
              const convFeeCents = listing.pass_convenience_fee
                ? Math.round(calcConvenienceFee(priceUsd) * 100)
                : 0
              const totalCents = listing.price + buyerFeeCents + convFeeCents
              return (
                <>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item price</span>
                      <span className="tabular-nums">{formatCents(listing.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Buyer fee (5%)</span>
                      <span className="tabular-nums">{formatCents(buyerFeeCents)}</span>
                    </div>
                    {listing.pass_convenience_fee && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Convenience fee</span>
                        <span className="tabular-nums">{formatCents(convFeeCents)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-1 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="tabular-nums">{formatCents(totalCents)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Buyer fee varies by membership tier.{' '}
                    <a href="/pricing" className="underline underline-offset-2 hover:text-foreground transition-colors">
                      View plans
                    </a>
                    {listing.pass_convenience_fee && ' Convenience fee covers card processing costs.'}
                  </p>
                </>
              )
            })()}
          </div>

          <form id="buy-now-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shipToName">Full Name</Label>
              <Input
                id="shipToName"
                value={shipToName}
                onChange={e => setShipToName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shipToStreet1">Street Address</Label>
              <Input
                id="shipToStreet1"
                value={shipToStreet1}
                onChange={e => setShipToStreet1(e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shipToStreet2">
                Apt / Suite <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="shipToStreet2"
                value={shipToStreet2}
                onChange={e => setShipToStreet2(e.target.value)}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="shipToCity">City</Label>
                <Input
                  id="shipToCity"
                  value={shipToCity}
                  onChange={e => setShipToCity(e.target.value)}
                  placeholder="Austin"
                  required
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="shipToState">State</Label>
                <Input
                  id="shipToState"
                  value={shipToState}
                  onChange={e => setShipToState(e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  required
                />
              </div>
              <div className="col-span-1 space-y-1.5">
                <Label htmlFor="shipToZip">ZIP Code</Label>
                <Input
                  id="shipToZip"
                  value={shipToZip}
                  onChange={e => setShipToZip(e.target.value)}
                  placeholder="78701"
                  required
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button
            type="submit"
            form="buy-now-form"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecting to payment…</>
            ) : (
              'Continue to Payment'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
