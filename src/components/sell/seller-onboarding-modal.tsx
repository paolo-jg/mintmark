'use client'

import { useState, useRef } from 'react'
import { Landmark, ArrowRight, Loader2, Check, Lock, ChevronLeft } from 'lucide-react'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

type Tier = 'collector_basic' | 'collector_premium' | 'dealer'

interface Props {
  tier: Tier
  stripeOnboardingComplete: boolean
  onComplete: () => void
}

type Step = 'plan' | 'stripe'

function getAllDisplaySteps(tier: Tier): Step[] {
  const steps: Step[] = []
  if (tier === 'collector_basic') steps.push('plan')
  steps.push('stripe')
  return steps
}

// ── Pricing data ──────────────────────────────────────────────────────────────
const COLLECTOR_TIERS = [
  {
    key: 'collector_basic',
    name: 'Free',
    fullName: 'Collector Basic',
    monthlyPrice: null as number | null,
    annualPrice: null as number | null,
    description: 'Get listed and start buying and selling rare coins.',
    features: ['7% buyer fee', '7% seller fee + card processing fees', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: null as string | null,
    isCurrent: true,
  },
  {
    key: 'collector_premium',
    name: 'Premium',
    fullName: 'Collector Premium',
    monthlyPrice: 9.99,
    annualPrice: null as number | null,
    description: 'Lower fees and more listings for active collectors.',
    features: ['1.9% buyer fee', '1.9% seller fee + card processing fees', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    highlighted: true,
    annualSavings: null as string | null,
    isCurrent: false,
  },
]

const DEALER_TIERS = [
  {
    key: 'dealer',
    name: 'Dealer',
    fullName: 'Dealer',
    monthlyPrice: 49.99,
    annualPrice: null as number | null,
    description: 'Unlimited listings, the lowest fees, and advanced tools for serious dealers.',
    features: ['1% buyer fee', '0% seller fee + card processing fees', '$0 per listing', 'Unlimited listings', 'Unlimited purchases', 'Advanced analytics', 'Advanced listing creation features'],
    highlighted: false,
    annualSavings: null as string | null,
  },
]

function formatPrice(price: number | null) {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

// ── Billing upsell ────────────────────────────────────────────────────────────
function BillingChoice({ tier, onBack }: { tier: typeof COLLECTOR_TIERS[0]; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-1">{tier.fullName}</p>
        <h2 className="text-xl font-bold mb-1">How would you like to pay?</h2>
        <p className="text-sm text-muted-foreground">Annual billing saves you money upfront.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <a
          href="/pricing"
          target="_blank"
          className="flex flex-col rounded-xl border border-border p-5 hover:border-foreground/30 transition-colors group"
        >
          <p className="text-xs text-muted-foreground font-medium mb-1">Monthly</p>
          <p className="text-3xl font-bold mb-0.5">{formatPrice(tier.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          <p className="text-xs text-muted-foreground mt-auto pt-3">Billed monthly, cancel anytime</p>
          <div className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
            Choose monthly →
          </div>
        </a>

        <a
          href="/pricing"
          target="_blank"
          className="flex flex-col rounded-xl border border-foreground/30 bg-muted/20 p-5 hover:border-foreground/50 transition-colors relative"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-block rounded-full bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background">
              {tier.annualSavings ?? 'Best value'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-medium mb-1">Annual</p>
          <p className="text-3xl font-bold mb-0.5">{formatPrice(tier.annualPrice)}<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
          <p className="text-xs text-muted-foreground mt-auto pt-3">Billed annually, cancel any time</p>
          <div className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-foreground text-background px-3 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
            Choose annual →
          </div>
        </a>
      </div>
    </div>
  )
}

// ── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, onSelect, onSkip }: {
  tier: typeof COLLECTOR_TIERS[0]
  onSelect: () => void
  onSkip?: () => void
}) {
  const isFree = tier.monthlyPrice === null

  return (
    <div className={`relative flex flex-col rounded-xl border p-6 ${
      tier.highlighted ? 'border-foreground/30 shadow-md' : 'border-border bg-background'
    }`}>
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background">
            Most popular
          </span>
        </div>
      )}

      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-0.5">{tier.fullName}</p>
      <h3 className="text-lg font-bold mb-3">{tier.name}</h3>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{isFree ? 'Free' : formatPrice(tier.monthlyPrice)}</span>
          {!isFree && <span className="text-xs text-muted-foreground">/mo</span>}
        </div>
        {!isFree && tier.annualPrice !== null && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{formatPrice(tier.annualPrice)}/yr billed annually</p>
        )}
      </div>

      <div className="space-y-1.5 flex-1">
        {tier.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <Check className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground leading-snug"><FeatureText text={f} /></span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        {isFree ? (
          <button
            onClick={onSkip}
            className="w-full inline-flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
          >
            Continue for free
          </button>
        ) : (
          <button
            onClick={onSelect}
            className={`w-full inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
              tier.highlighted
                ? 'bg-foreground text-background border-foreground hover:opacity-90'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            Get started →
          </button>
        )}
      </div>
    </div>
  )
}

const ALL_TIERS = [
  ...COLLECTOR_TIERS,
  ...(DEALER_TIERS as typeof COLLECTOR_TIERS),
]

// ── Step: Plan upgrade ────────────────────────────────────────────────────────
function PlanStep({ onSkip, selectedTier, onSelectTier }: {
  onSkip: () => void
  selectedTier: typeof COLLECTOR_TIERS[0] | null
  onSelectTier: (t: typeof COLLECTOR_TIERS[0] | null) => void
}) {
  if (selectedTier) {
    return <BillingChoice tier={selectedTier} onBack={() => onSelectTier(null)} />
  }

  return (
    <div
      className="absolute inset-0"
      style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '12px' }}
    >
      <h2 className="text-lg font-bold">Choose a plan</h2>
      <p className="text-xs text-muted-foreground">
        All paid plans include a{' '}
        <span className="font-medium text-foreground">30-day free trial</span>.
        {' '}You can change your plan at any time from Settings.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {ALL_TIERS.map((tier, i) => (
          <TierCard key={i} tier={tier} onSelect={() => onSelectTier(tier)} onSkip={onSkip} />
        ))}
      </div>
    </div>
  )
}

// ── Step: Stripe Connect ──────────────────────────────────────────────────────
function StripeStep() {
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
          Link your bank account to receive payouts when your coins sell.
          Takes about 2 minutes.
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? 'Redirecting to Stripe…' : 'Link bank account'}
      </button>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SellerOnboardingModal({ tier, onComplete }: Props) {
  const allDisplaySteps = getAllDisplaySteps(tier)

  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set())
  const [stepIndex, setStepIndex] = useState(0)
  const [planSelectedTier, setPlanSelectedTier] = useState<typeof COLLECTOR_TIERS[0] | null>(null)
  const prevStepIndex = useRef(stepIndex)
  if (prevStepIndex.current !== stepIndex) {
    prevStepIndex.current = stepIndex
    if (planSelectedTier !== null) setPlanSelectedTier(null)
  }

  const currentStep = allDisplaySteps[stepIndex]

  const next = () => {
    const step = allDisplaySteps[stepIndex]
    const updated = new Set(completedSteps)
    updated.add(step)
    setCompletedSteps(updated)

    if (stepIndex + 1 < allDisplaySteps.length) {
      setStepIndex(stepIndex + 1)
    } else if (allDisplaySteps.every(s => updated.has(s))) {
      onComplete()
    }
  }

  const isPlanStep = currentStep === 'plan'

  return (
    <div className="fixed top-16 inset-x-0 bottom-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4 py-4">
      <div className={`relative w-full rounded-2xl border border-border bg-background shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] transition-[max-width,height] duration-300 ${isPlanStep ? 'max-w-5xl p-6 h-[640px]' : 'max-w-lg p-8 h-[560px]'}`}>

        <button
          onClick={() => {
            if (planSelectedTier) { setPlanSelectedTier(null); return }
            setStepIndex(stepIndex - 1)
          }}
          style={{ visibility: (planSelectedTier || stepIndex > 0) ? 'visible' : 'hidden' }}
          className={`absolute ${isPlanStep ? 'top-10' : 'top-12'} left-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors`}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {allDisplaySteps.length > 1 && (
          <div className="flex-shrink-0 flex items-start justify-center gap-0 mb-8">
            {allDisplaySteps.map((step, i) => {
              const isCurrent  = i === stepIndex
              const isComplete = i < stepIndex
              const isClickable = completedSteps.has(step) && !isCurrent
              const label = step === 'plan' ? 'Plan' : 'Bank Account'

              return (
                <div key={step} className="flex items-start">
                  <button
                    onClick={() => setStepIndex(i)}
                    disabled={!isClickable}
                    className={`flex flex-col items-center gap-1.5 ${isClickable ? 'cursor-pointer group' : 'cursor-default'}`}
                    aria-label={isClickable ? `Go back to ${label}` : label}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold ${
                      isComplete
                        ? 'bg-foreground text-background group-hover:opacity-75'
                        : isCurrent
                        ? 'border-2 border-foreground bg-background text-foreground'
                        : 'border-2 border-border bg-background text-muted-foreground/40'
                    }`}>
                      {isComplete ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                      isCurrent   ? 'text-foreground'
                      : isComplete ? 'text-muted-foreground'
                      : 'text-muted-foreground/40'
                    }`}>
                      {label}
                    </span>
                  </button>

                  {i < allDisplaySteps.length - 1 && (
                    <div className="flex-1 mt-4 mx-2" style={{ minWidth: '3rem' }}>
                      <div className={`h-px transition-colors duration-300 ${i < stepIndex ? 'bg-foreground' : 'bg-border'}`} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className={`flex-1 min-h-0 flex flex-col ${isPlanStep ? 'overflow-hidden relative' : 'overflow-y-auto justify-center'}`}>
          {currentStep === 'plan'   && <PlanStep onSkip={next} selectedTier={planSelectedTier} onSelectTier={setPlanSelectedTier} />}
          {currentStep === 'stripe' && <StripeStep />}
        </div>
      </div>
    </div>
  )
}
