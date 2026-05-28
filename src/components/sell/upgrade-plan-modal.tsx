'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    tier: 'collector_premium',
    name: 'Collector Premium',
    price: '$9.99',
    period: '/mo',
    features: [
      '1.9% seller fee',
      '$0.40 per listing',
      'Up to 50 listings/month',
      'Unlimited purchases',
    ],
  },
  {
    tier: 'dealer',
    name: 'Dealer',
    price: '$49.99',
    period: '/mo',
    highlighted: true,
    features: [
      '0% seller fee',
      '$0 per listing',
      'Unlimited listings',
      'Unlimited purchases',
      'Advanced analytics',
    ],
  },
]

interface UpgradePlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnPath?: string
}

export function UpgradePlanModal({ open, onOpenChange, returnPath }: UpgradePlanModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpgrade = async (tier: string) => {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, return_url: returnPath ?? '/sell' }),
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        toast.error(json.error ?? 'Something went wrong')
        setLoading(null)
      }
    } catch {
      toast.error('Something went wrong')
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            You&apos;ve reached your monthly listing limit. Upgrade to keep listing.
            Your existing listings, history, and account stay exactly as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {PLANS.map(plan => (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-xl border p-5 ${
                plan.highlighted
                  ? 'border-foreground/30 shadow-md ring-1 ring-foreground/10'
                  : 'border-border'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase bg-foreground text-background px-3 py-0.5 rounded-full whitespace-nowrap">
                  Most popular
                </span>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-1.5 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
                onClick={() => handleUpgrade(plan.tier)}
                disabled={loading !== null}
              >
                {loading === plan.tier ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting…</>
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-1">
          Your listings, history, and account carry over automatically. No re-onboarding needed.
        </p>
      </DialogContent>
    </Dialog>
  )
}
