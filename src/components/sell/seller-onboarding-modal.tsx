'use client'

import { useState, useRef } from 'react'
import { FileText, Landmark, ArrowRight, Loader2, Check, Lock, ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

type Tier = 'collector_basic' | 'collector_standard' | 'collector_premium' | 'dealer_basic' | 'dealer_standard' | 'dealer_premium'
type Group = 'collectors' | 'dealers'

interface Props {
  tier: Tier
  sellerTosAgreed: boolean
  privacyPolicyAgreed: boolean
  stripeOnboardingComplete: boolean
  onComplete: () => void
}

type Step = 'tos' | 'plan' | 'stripe'

// All steps for this user — used for the progress bar (never shrinks)
function getAllDisplaySteps(tier: Tier): Step[] {
  const steps: Step[] = ['tos']
  if (tier === 'collector_basic') steps.push('plan')
  steps.push('stripe')
  return steps
}

// ── Pricing data ──────────────────────────────────────────────────────────────
const COLLECTOR_TIERS = [
  {
    key: 'collector_basic',
    name: 'Basic',
    fullName: 'Collector Basic',
    monthlyPrice: null as number | null,
    annualPrice: null as number | null,
    description: 'Get listed and start buying and selling graded coins.',
    features: ['7% buyer fee', '7% seller fee + card processing fees', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: null as string | null,
    isCurrent: true,
  },
  {
    key: 'collector_standard',
    name: 'Standard',
    fullName: 'Collector Standard',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    description: 'Lower fees and more listings for active collectors.',
    features: ['5% buyer fee', '5% seller fee + card processing fees', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    highlighted: true,
    annualSavings: 'Save $19.89/yr',
    isCurrent: false,
  },
  {
    key: 'collector_premium',
    name: 'Premium',
    fullName: 'Collector Premium',
    monthlyPrice: 49,
    annualPrice: 499,
    description: 'Maximum listings and the lowest fees for serious collectors.',
    features: ['1% buyer fee', '5% seller fee + card processing fees', '$0.30 per listing', 'Up to 100 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: 'Save $89/yr',
    isCurrent: false,
  },
]

const DEALER_TIERS = [
  {
    key: 'dealer_basic',
    name: 'Basic',
    fullName: 'Dealer Basic',
    monthlyPrice: 199,
    annualPrice: 1999,
    description: 'Unlimited listings and a dedicated dealer profile.',
    features: ['1% buyer fee', '2.5% seller fee + card processing fees', '$0.20 per listing', 'Unlimited listings', 'Dealer profile page', 'Custom logo & description'],
    highlighted: false,
    annualSavings: 'Save $389/yr',
  },
  {
    key: 'dealer_standard',
    name: 'Standard',
    fullName: 'Dealer Standard',
    monthlyPrice: 399,
    annualPrice: 3999,
    description: 'Priority ranking and significantly reduced fees.',
    features: ['1% buyer fee', '1% seller fee + card processing fees', '$0.10 per listing', 'Unlimited listings', 'Priority dealer ranking', 'Custom logo & description'],
    highlighted: false,
    annualSavings: 'Save $789/yr',
  },
  {
    key: 'dealer_premium',
    name: 'Premium',
    fullName: 'Dealer Premium',
    monthlyPrice: 599,
    annualPrice: 5999,
    description: 'Zero sell fees and top placement across the platform.',
    features: ['0% buyer fee', '0% seller fee + card processing fees', '$0 per listing', 'Unlimited listings', 'Top dealer ranking', 'Custom logo & description'],
    highlighted: false,
    annualSavings: 'Save $1,189/yr',
  },
]

function formatPrice(price: number | null) {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

// ── Billing upsell (shown after picking a paid plan) ──────────────────────────
function BillingChoice({ tier, onBack }: { tier: typeof COLLECTOR_TIERS[0]; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-1">{tier.fullName}</p>
        <h2 className="text-xl font-bold mb-1">How would you like to pay?</h2>
        <p className="text-sm text-muted-foreground">Annual billing saves you money upfront.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Monthly */}
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

        {/* Annual */}
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
          <p className="text-xs text-muted-foreground mt-auto pt-3">
            Billed annually, cancel any time
          </p>
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

// ── Step: Seller ToS + Privacy Policy ────────────────────────────────────────
function TosStep({ onNext, revisit = false }: { onNext: () => void; revisit?: boolean }) {
  const [agreedSeller, setAgreedSeller] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)

  const allAgreed = agreedSeller && agreedPrivacy

  // Revisit view — already agreed, no need to re-check boxes
  if (revisit) {
    return (
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <div className="flex justify-center mb-5">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <Check className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-1.5">Seller Agreements</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You've already accepted our{' '}
            <a href="/legal/seller-terms" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">Seller Terms</a>
            {' '}and{' '}
            <a href="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">Privacy Policy</a>.
          </p>
        </div>
        <button
          onClick={onNext}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="h-4 w-4" />
          Continue
        </button>
      </div>
    )
  }

  const handleAccept = async () => {
    if (!allAgreed) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        seller_tos_agreed: true,
        privacy_policy_agreed: true,
      }).eq('id', user.id)
    }
    setLoading(false)
    onNext()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">Seller Agreements</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Before listing coins for sale, please review and accept our terms and privacy policy.
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-4 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input type="checkbox" checked={agreedSeller} onChange={e => setAgreedSeller(e.target.checked)} className="sr-only" />
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${agreedSeller ? 'bg-foreground border-foreground' : 'border-border group-hover:border-foreground/40'}`}>
              {agreedSeller && <Check className="h-3 w-3 text-background" />}
            </div>
          </div>
          <span className="text-sm text-muted-foreground leading-snug">
            I agree to the{' '}
            <a href="/legal/seller-terms" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Seller Terms of Service
            </a>.
          </span>
        </label>

        <label className="flex items-start gap-4 cursor-pointer group">
          <div className="relative mt-0.5 flex-shrink-0">
            <input type="checkbox" checked={agreedPrivacy} onChange={e => setAgreedPrivacy(e.target.checked)} className="sr-only" />
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${agreedPrivacy ? 'bg-foreground border-foreground' : 'border-border group-hover:border-foreground/40'}`}>
              {agreedPrivacy && <Check className="h-3 w-3 text-background" />}
            </div>
          </div>
          <span className="text-sm text-muted-foreground leading-snug">
            I have read and agree to the{' '}
            <a href="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Privacy Policy
            </a>.
          </span>
        </label>
      </div>

      <button
        onClick={handleAccept}
        disabled={!allAgreed || loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {loading ? 'Saving…' : 'Accept & Continue'}
      </button>
    </div>
  )
}

// ── Step: Plan upgrade ────────────────────────────────────────────────────────
function PlanStep({ onSkip, selectedTier, onSelectTier }: {
  onSkip: () => void
  selectedTier: typeof COLLECTOR_TIERS[0] | null
  onSelectTier: (t: typeof COLLECTOR_TIERS[0] | null) => void
}) {
  const [group, setGroup] = useState<Group>('collectors')

  if (selectedTier) {
    return <BillingChoice tier={selectedTier} onBack={() => onSelectTier(null)} />
  }

  // CSS grid with explicit row sizes so nothing can reflow on toggle.
  // Row 1 (auto): header. Row 2 (auto): notice. Row 3 (1fr): cards.
  return (
    <div
      className="absolute inset-0"
      style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '12px' }}
    >
      {/* Row 1 — header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Choose a plan</h2>
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 gap-1">
          {(['collectors', 'dealers'] as Group[]).map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-4 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                group === g
                  ? 'bg-background text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {g === 'collectors' ? 'Collectors' : 'Dealers'}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — trial notice */}
      <p className="text-xs text-muted-foreground text-center">
        All paid plans include a{' '}
        <span className="font-medium text-foreground">30-day free trial</span>.
        {' '}You can change your plan at any time from Settings.
      </p>

      {/* Row 3 — both grids always in DOM, stacked, visibility-toggled only.
          visibility:hidden keeps each grid's box intact so row 3 never resizes. */}
      <div className="relative">
        <div className={`absolute inset-0 grid grid-cols-3 gap-4 ${group !== 'collectors' ? 'invisible pointer-events-none' : ''}`}>
          {COLLECTOR_TIERS.map((tier, i) => (
            <TierCard key={i} tier={tier} onSelect={() => onSelectTier(tier)} onSkip={onSkip} />
          ))}
        </div>
        <div className={`absolute inset-0 grid grid-cols-3 gap-4 ${group !== 'dealers' ? 'invisible pointer-events-none' : ''}`}>
          {DEALER_TIERS.map((tier, i) => (
            <TierCard key={i} tier={tier as typeof COLLECTOR_TIERS[0]} onSelect={() => onSelectTier(tier as typeof COLLECTOR_TIERS[0])} onSkip={onSkip} />
          ))}
        </div>
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
export function SellerOnboardingModal({ tier, sellerTosAgreed, privacyPolicyAgreed, stripeOnboardingComplete, onComplete }: Props) {
  const allDisplaySteps = getAllDisplaySteps(tier)

  // Track which steps have been completed
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(() => {
    const set = new Set<Step>()
    if (sellerTosAgreed && privacyPolicyAgreed) set.add('tos')
    // 'plan' is never pre-completed — must be chosen each session until bank is linked
    if (stripeOnboardingComplete) set.add('stripe')
    return set
  })

  // Always start at step 0 — no skipping ahead on refresh
  const [stepIndex, setStepIndex] = useState(0)

  // selectedTier lives here so the back button can detect the BillingChoice sub-page.
  // Reset to null on every step change so returning to plan always shows the grid.
  const [planSelectedTier, setPlanSelectedTier] = useState<typeof COLLECTOR_TIERS[0] | null>(null)
  const prevStepIndex = useRef(stepIndex)
  if (prevStepIndex.current !== stepIndex) {
    prevStepIndex.current = stepIndex
    if (planSelectedTier !== null) setPlanSelectedTier(null)
  }

  const currentStep = allDisplaySteps[stepIndex]

  // Advance to the next step after completing the current one
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
    // z-40 keeps us below the navbar (z-50) so users can navigate away via the nav
    <div className="fixed top-16 inset-x-0 bottom-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4 py-4">
      <div className={`relative w-full rounded-2xl border border-border bg-background shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] transition-[max-width,height] duration-300 ${isPlanStep ? 'max-w-5xl p-6 h-[640px]' : 'max-w-lg p-8 h-[560px]'}`}>

        {/* Back button — top-left corner, absolutely positioned so it never affects layout.
            On BillingChoice sub-page: clears planSelectedTier (back to plan grid).
            On other steps: goes to previous step. Hidden on plan grid (use progress bar). */}
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

        {/* Progress bar — flex-shrink-0 keeps it fixed; only the content area scrolls */}
        {allDisplaySteps.length > 1 && (
          <div className="flex-shrink-0 flex items-start justify-center gap-0 mb-8">
            {allDisplaySteps.map((step, i) => {
              const isCurrent  = i === stepIndex
              const isComplete = i < stepIndex          // positional: everything before current = done
              const isUpcoming = i > stepIndex
              // Disable all navigation while on the ToS step (must agree before moving)
              const isClickable = currentStep !== 'tos' && completedSteps.has(step) && !isCurrent
              const label = step === 'tos' ? 'Agreement' : step === 'plan' ? 'Plan' : 'Bank Account'

              return (
                <div key={step} className="flex items-start">
                  {/* Circle + label as one interactive unit */}
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

                  {/* Connector — solid once the step to its left is behind the current position */}
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

        {/* Content area */}
        <div className={`flex-1 min-h-0 flex flex-col ${isPlanStep ? 'overflow-hidden relative' : 'overflow-y-auto justify-center'}`}>
          {currentStep === 'tos'    && <TosStep onNext={next} revisit={sellerTosAgreed && privacyPolicyAgreed} />}
          {currentStep === 'plan'   && <PlanStep onSkip={next} selectedTier={planSelectedTier} onSelectTier={setPlanSelectedTier} />}
          {currentStep === 'stripe' && <StripeStep />}
        </div>
      </div>
    </div>
  )
}
