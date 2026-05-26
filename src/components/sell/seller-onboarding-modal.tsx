'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Landmark, ArrowRight, Loader2, CheckCircle2, ExternalLink, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tier = 'collector_basic' | 'collector_standard' | 'collector_premium' | 'dealer_basic' | 'dealer_standard' | 'dealer_premium'

interface Props {
  tier: Tier
  sellerTosAgreed: boolean
  stripeOnboardingComplete: boolean
  onComplete: () => void
}

type Step = 'tos' | 'plan' | 'stripe'

function getSteps(tier: Tier, tosAgreed: boolean, stripeComplete: boolean): Step[] {
  const steps: Step[] = []
  if (!tosAgreed) steps.push('tos')
  if (tier === 'collector_basic') steps.push('plan')
  if (!stripeComplete) steps.push('stripe')
  return steps
}

// ── Pricing data (mirrors pricing-section.tsx) ────────────────────────────────
const COLLECTOR_TIERS = [
  {
    key: 'collector_basic',
    name: 'Collector Basic',
    price: null as number | null,
    description: 'For casual collectors just getting started.',
    features: ['7% buyer fee', '7% seller fee', '$0.50 per listing', 'Up to 10 active listings/month'],
    highlighted: false,
    current: true,
  },
  {
    key: 'collector_standard',
    name: 'Collector Standard',
    price: 9.99,
    description: 'For collectors who list more regularly.',
    features: ['5% buyer fee', '5% seller fee', '$0.40 per listing', 'Up to 50 active listings/month'],
    highlighted: true,
    current: false,
  },
  {
    key: 'collector_premium',
    name: 'Collector Premium',
    price: 49,
    description: 'For serious collectors with large inventories.',
    features: ['3% buyer fee', '3% seller fee', '$0.30 per listing', 'Up to 200 active listings/month'],
    highlighted: false,
    current: false,
  },
]

const DEALER_TIERS = [
  {
    key: 'dealer_basic',
    name: 'Dealer Basic',
    price: 299,
    description: 'For dealers ready to scale without limits.',
    features: ['2.5% buyer fee', '2.5% seller fee', '$0.20 per listing', 'Unlimited listings'],
    highlighted: false,
  },
  {
    key: 'dealer_standard',
    name: 'Dealer Standard',
    price: 599,
    description: 'For established dealers moving serious volume.',
    features: ['2% buyer fee', '1% seller fee', '$0.10 per listing', 'Unlimited listings'],
    highlighted: false,
  },
  {
    key: 'dealer_premium',
    name: 'Dealer Premium',
    price: 999,
    description: 'Maximum savings for the highest-volume dealers.',
    features: ['1% buyer fee', '0% seller fee', '$0 per listing', 'Unlimited listings'],
    highlighted: false,
  },
]

function fmt(price: number | null) {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

// ── Step: Seller ToS ─────────────────────────────────────────────────────────
function TosStep({ onNext }: { onNext: () => void }) {
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    if (!agreed) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ seller_tos_agreed: true }).eq('id', user.id)
    }
    setLoading(false)
    onNext()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-1.5">Seller Agreement</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Before listing coins for sale, please review and accept our seller terms.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
        {[
          'All coins must be accurately described and authentically graded.',
          'Sellers are responsible for shipping within 3 business days of sale.',
          'Pedigree Coins charges a platform fee on each completed sale.',
          'Misrepresentation or fraud will result in immediate account suspension.',
          'Disputes are handled through our resolution centre per platform policy.',
        ].map((term, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-muted-foreground leading-snug">{term}</span>
          </div>
        ))}
      </div>

      <a
        href="/legal/seller-terms"
        target="_blank"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Read full Seller Terms <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="sr-only" />
          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${agreed ? 'bg-foreground border-foreground' : 'border-border group-hover:border-foreground/40'}`}>
            {agreed && <Check className="h-3 w-3 text-background" />}
          </div>
        </div>
        <span className="text-sm text-muted-foreground leading-snug">
          I have read and agree to the Pedigree Coins Seller Terms of Service.
        </span>
      </label>

      <button
        onClick={handleAccept}
        disabled={!agreed || loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? 'Saving…' : 'Accept & Continue'}
      </button>
    </div>
  )
}

// ── Step: Plan upgrade ────────────────────────────────────────────────────────
function PlanStep({ onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1.5">Choose a plan</h2>
        <p className="text-sm text-muted-foreground">
          You're on the free plan — limited to 10 listings/month. Upgrade for more listings and lower fees.
        </p>
      </div>

      {/* Collector tiers */}
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Collectors</p>
        <div className="grid grid-cols-3 gap-3">
          {COLLECTOR_TIERS.map(tier => (
            <div
              key={tier.key}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                tier.highlighted
                  ? 'border-foreground/30 shadow-sm bg-background'
                  : tier.current
                  ? 'border-border bg-muted/30'
                  : 'border-border bg-background'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-foreground px-3 py-0.5 text-xs font-semibold text-background">
                    Recommended
                  </span>
                </div>
              )}
              {tier.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-muted border border-border px-3 py-0.5 text-xs font-semibold text-muted-foreground">
                    Current plan
                  </span>
                </div>
              )}

              <div className="mb-3">
                <h3 className="font-semibold text-sm mb-0.5">{tier.name}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{tier.description}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{fmt(tier.price)}</span>
                  {tier.price !== null && <span className="text-xs text-muted-foreground">/mo</span>}
                </div>
              </div>

              <ul className="space-y-1.5 mb-5 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {tier.current ? (
                <div className="w-full text-center text-xs text-muted-foreground py-2">
                  Current plan
                </div>
              ) : (
                <a
                  href="/pricing"
                  target="_blank"
                  className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-foreground text-background border-foreground hover:opacity-90'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  Get Started
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dealer tiers */}
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Dealers</p>
        <div className="grid grid-cols-3 gap-3">
          {DEALER_TIERS.map(tier => (
            <div key={tier.key} className="flex flex-col rounded-2xl border border-border bg-background p-5">
              <div className="mb-3">
                <h3 className="font-semibold text-sm mb-0.5">{tier.name}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{tier.description}</p>
              </div>
              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{fmt(tier.price)}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-5 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/pricing"
                target="_blank"
                className="inline-flex w-full items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <button
          onClick={onSkip}
          className="w-full inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors text-muted-foreground"
        >
          Continue with free plan (10 listings/month)
        </button>
      </div>
    </div>
  )
}

// ── Step: Stripe Connect ──────────────────────────────────────────────────────
function StripeStep({ onComplete }: { onComplete: () => void }) {
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
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <div className="flex justify-center mb-5">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
            <Landmark className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-1.5">Connect your bank</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set up payouts so you can receive money when your coins sell.
          Powered by Stripe — secure and takes about 2 minutes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        {[
          'Bank-level encryption via Stripe',
          'Payouts deposited directly to your account',
          'Only the platform fee applies — no charge to connect',
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? 'Redirecting to Stripe…' : 'Set up payouts'}
        </button>
        <button
          onClick={onComplete}
          className="w-full inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors text-muted-foreground"
        >
          I'll do this later
        </button>
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SellerOnboardingModal({ tier, sellerTosAgreed, stripeOnboardingComplete, onComplete }: Props) {
  const router = useRouter()
  const allSteps = getSteps(tier, sellerTosAgreed, stripeOnboardingComplete)
  const [stepIndex, setStepIndex] = useState(0)

  if (allSteps.length === 0) return null

  const currentStep = allSteps[stepIndex]
  const totalSteps = allSteps.length
  const stepNumber = stepIndex + 1
  const isPlanStep = currentStep === 'plan'

  const next = () => {
    if (stepIndex + 1 < allSteps.length) setStepIndex(stepIndex + 1)
    else onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4 py-8">
      <div className={`w-full rounded-2xl border border-border bg-background shadow-2xl p-8 overflow-y-auto max-h-[90vh] transition-all ${isPlanStep ? 'max-w-4xl' : 'max-w-md'}`}>

        {/* Progress dots */}
        {totalSteps > 1 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {allSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= stepIndex ? 'w-6 bg-foreground' : 'w-3 bg-muted-foreground/30'}`}
              />
            ))}
          </div>
        )}

        {totalSteps > 1 && (
          <p className="text-center text-xs text-muted-foreground font-medium tracking-widest uppercase mb-6">
            Step {stepNumber} of {totalSteps}
          </p>
        )}

        {currentStep === 'tos' && <TosStep onNext={next} />}
        {currentStep === 'plan' && (
          <PlanStep onNext={() => router.push('/pricing')} onSkip={next} />
        )}
        {currentStep === 'stripe' && <StripeStep onComplete={next} />}
      </div>
    </div>
  )
}
