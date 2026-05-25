'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, ArrowRight, Loader2, X } from 'lucide-react'
import Link from 'next/link'

interface Props {
  /** Called after the user clicks "Back" — defaults to router.back() */
  onBack?: () => void
}

/**
 * Full-screen blocking modal shown when a seller hasn't completed
 * Stripe Connect onboarding. Cannot be dismissed — they must either
 * set up payouts or navigate back.
 */
export function StripeConnectGate({ onBack }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/connect/create', { method: 'POST' })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl p-8 text-center">

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Landmark className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>

        {/* Copy */}
        <h2 className="text-xl font-bold mb-2">Set up payouts first</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          You need to connect a bank account before you can list coins for sale.
          This ensures you can receive payment when your coins sell.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              : <><ArrowRight className="h-4 w-4" /> Set up payouts</>
            }
          </button>
          <button
            onClick={handleBack}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" /> Back to My Listings
          </button>
        </div>
      </div>
    </div>
  )
}
