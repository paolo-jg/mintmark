'use client'

import { useState } from 'react'
import { Landmark, Loader2, Lock } from 'lucide-react'

type Tier = 'collector_basic' | 'collector_premium' | 'dealer'

interface Props {
  tier: Tier
  stripeOnboardingComplete: boolean
  onComplete: () => void
}

export function SellerOnboardingModal({ onComplete: _onComplete }: Props) {
  const [loading, setLoading] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect/create', { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="fixed top-16 inset-x-0 bottom-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4 py-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl flex flex-col p-8">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <div className="flex justify-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Landmark className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-1.5">Connect your bank</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link your bank account to receive payouts when your coins sell.
              This usually only takes a few minutes.
            </p>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Secured with 256-bit AES encryption via Stripe</span>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Redirecting to Stripe…' : 'Link bank account'}
          </button>
        </div>
      </div>
    </div>
  )
}
