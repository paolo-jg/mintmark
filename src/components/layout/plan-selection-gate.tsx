'use client'

import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    tier: 'collector_premium',
    name: 'Collector Premium',
    price: '$9.99/mo',
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
    price: '$49.99/mo',
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

async function fetchPlanGate(): Promise<{ requiresPlanSelection: boolean }> {
  const res = await fetch('/api/me/plan-gate')
  if (!res.ok) return { requiresPlanSelection: false }
  return res.json()
}

export function PlanSelectionGate() {
  const { data } = useSWR('plan-gate', fetchPlanGate, { revalidateOnFocus: false })
  const [loading, setLoading] = useState<string | null>(null)

  if (!data?.requiresPlanSelection) return null

  const handleUpgrade = async (tier: string) => {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, return_url: '/sell' }),
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

  const handleContinueFree = async () => {
    setLoading('free')
    try {
      await fetch('/api/me/plan-gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue_free' }),
      })
      await mutate('plan-gate', { requiresPlanSelection: false }, false)
    } catch {
      toast.error('Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg my-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Your free period has ended</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your referral-granted subscription has expired and your account has been moved to the free plan.
            Choose how you want to continue below. Your existing listings, orders, and collection are untouched.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {PLANS.map(plan => (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-2xl border p-6 ${
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
                <p className="text-xl font-bold">{plan.price}</p>
              </div>

              <ul className="space-y-1.5 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.tier)}
                disabled={loading !== null}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold h-10 px-4 transition-opacity disabled:opacity-60 ${
                  plan.highlighted
                    ? 'bg-foreground text-background hover:opacity-90'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {loading === plan.tier
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Redirecting...</>
                  : `Upgrade to ${plan.name}`
                }
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleContinueFree}
          disabled={loading !== null}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium h-10 px-4 hover:bg-muted transition-colors disabled:opacity-60"
        >
          {loading === 'free'
            ? <><Loader2 className="h-4 w-4 animate-spin" />Updating...</>
            : 'Continue on Free Plan (10 listings/month)'
          }
        </button>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Your existing active listings remain live regardless of which plan you choose.
        </p>
      </div>
    </div>
  )
}
