'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText, Landmark, ArrowRight, Loader2, CheckCircle2,
  ExternalLink, ChevronRight, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tier = 'collector_basic' | 'collector_standard' | 'collector_premium' | 'dealer_basic' | 'dealer_standard' | 'dealer_premium'

interface Props {
  tier: Tier
  sellerTosAgreed: boolean
  stripeOnboardingComplete: boolean
  /** Called when all steps are done */
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
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <FileText className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1.5">Seller Agreement</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Before listing coins for sale, please review and accept our seller terms.
        </p>
      </div>

      {/* Terms summary */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 text-sm">
        {[
          'All coins must be accurately described and authentically graded.',
          'Sellers are responsible for shipping within 3 business days of sale.',
          'Pedigree Coins charges a 5% platform fee on each completed sale.',
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

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative mt-0.5 flex-shrink-0">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => setAgreed(e.target.checked)}
            className="sr-only"
          />
          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
            agreed ? 'bg-foreground border-foreground' : 'border-border group-hover:border-foreground/40'
          }`}>
            {agreed && <CheckCircle2 className="h-3.5 w-3.5 text-background" />}
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
function PlanStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Zap className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1.5">Choose a plan</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You're on the free plan — limited to 10 listings per month.
          Upgrade anytime for more listings and lower fees.
        </p>
      </div>

      {/* Plan cards */}
      <div className="space-y-3">
        {[
          {
            name: 'Collector Standard',
            price: '$9',
            listings: '50 listings/mo',
            highlight: false,
          },
          {
            name: 'Collector Premium',
            price: '$19',
            listings: '200 listings/mo',
            highlight: true,
          },
          {
            name: 'Dealer Basic',
            price: '$49',
            listings: 'Unlimited listings',
            highlight: false,
          },
        ].map(plan => (
          <a
            key={plan.name}
            href="/pricing"
            className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors hover:border-foreground/40 ${
              plan.highlight ? 'border-foreground/30 bg-muted/40' : 'border-border'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.listings}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{plan.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onNext}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="h-4 w-4" />
          View all plans & upgrade
        </button>
        <button
          onClick={onSkip}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors text-muted-foreground"
        >
          Continue with free plan (10 listings/mo)
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
      if (json.url) {
        window.location.href = json.url
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
          <Landmark className="h-7 w-7 text-muted-foreground" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-bold mb-1.5">Connect your bank</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Set up payouts so you can receive money when your coins sell.
          This is powered by Stripe — secure and takes about 2 minutes.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        {[
          'Bank-level encryption via Stripe',
          'Payouts deposited directly to your account',
          'No fees to connect — only the 5% platform fee on sales',
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors text-muted-foreground"
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

  // No steps needed — already onboarded
  if (allSteps.length === 0) return null

  const currentStep = allSteps[stepIndex]
  const totalSteps = allSteps.length
  const stepNumber = stepIndex + 1

  const next = () => {
    if (stepIndex + 1 < allSteps.length) {
      setStepIndex(stepIndex + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl p-8">

        {/* Progress dots */}
        {totalSteps > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {allSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < stepIndex
                    ? 'w-6 bg-foreground'
                    : i === stepIndex
                    ? 'w-6 bg-foreground'
                    : 'w-3 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step label */}
        {totalSteps > 1 && (
          <p className="text-center text-xs text-muted-foreground font-medium tracking-widest uppercase mb-6">
            Step {stepNumber} of {totalSteps}
          </p>
        )}

        {/* Step content */}
        {currentStep === 'tos' && <TosStep onNext={next} />}
        {currentStep === 'plan' && (
          <PlanStep
            onNext={() => router.push('/pricing')}
            onSkip={next}
          />
        )}
        {currentStep === 'stripe' && <StripeStep onComplete={next} />}
      </div>
    </div>
  )
}
