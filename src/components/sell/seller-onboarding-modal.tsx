'use client'

import { useState } from 'react'
import { FileText, Landmark, ArrowRight, Loader2, CheckCircle2, ExternalLink, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

type Tier = 'collector_basic' | 'collector_standard' | 'collector_premium' | 'dealer_basic' | 'dealer_standard' | 'dealer_premium'
type Group = 'collectors' | 'dealers'

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
    features: ['3% buyer fee', '3% seller fee + card processing fees', '$0.30 per listing', 'Up to 200 active listings/month', 'Unlimited purchases'],
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
    monthlyPrice: 299,
    annualPrice: 2999,
    description: 'Unlimited listings and a dedicated dealer profile.',
    features: ['2.5% buyer fee', '2.5% seller fee + card processing fees', '$0.20 per listing', 'Unlimited listings', 'Dealer profile page', 'Custom logo & description'],
    highlighted: false,
    annualSavings: 'Save $589/yr',
  },
  {
    key: 'dealer_standard',
    name: 'Standard',
    fullName: 'Dealer Standard',
    monthlyPrice: 599,
    annualPrice: 5999,
    description: 'Priority ranking and significantly reduced fees.',
    features: ['2% buyer fee', '1% seller fee + card processing fees', '$0.10 per listing', 'Unlimited listings', 'Priority dealer ranking', 'Custom logo & description'],
    highlighted: true,
    annualSavings: 'Save $1,189/yr',
  },
  {
    key: 'dealer_premium',
    name: 'Premium',
    fullName: 'Dealer Premium',
    monthlyPrice: 999,
    annualPrice: 9999,
    description: 'Zero sell fees and top placement across the platform.',
    features: ['1% buyer fee', '0% seller fee + card processing fees', '$0 per listing', 'Unlimited listings', 'Top dealer ranking', 'Custom logo & description'],
    highlighted: false,
    annualSavings: 'Save $1,989/yr',
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
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        ← Back
      </button>
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
            ≈ {formatPrice(tier.annualPrice !== null ? Math.round(tier.annualPrice / 12) : null)}/mo · billed once
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
    <div className={`relative flex flex-col rounded-xl border p-6 min-h-[380px] ${
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
function PlanStep({ onSkip }: { onSkip: () => void }) {
  const [group, setGroup] = useState<Group>('collectors')
  const [selectedTier, setSelectedTier] = useState<typeof COLLECTOR_TIERS[0] | null>(null)

  const tiers = group === 'collectors' ? COLLECTOR_TIERS : DEALER_TIERS

  if (selectedTier) {
    return <BillingChoice tier={selectedTier} onBack={() => setSelectedTier(null)} />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">Choose a plan</h2>
        <p className="text-sm text-muted-foreground">
          Upgrade for more listings and lower fees, or continue for free.
        </p>
      </div>

      {/* Group toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1 gap-1">
          {(['collectors', 'dealers'] as Group[]).map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
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

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-5">
        {tiers.map(tier => (
          <TierCard
            key={tier.key}
            tier={tier as typeof COLLECTOR_TIERS[0]}
            onSelect={() => setSelectedTier(tier as typeof COLLECTOR_TIERS[0])}
            onSkip={onSkip}
          />
        ))}
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
  const allSteps = getSteps(tier, sellerTosAgreed, stripeOnboardingComplete)
  const [stepIndex, setStepIndex] = useState(0)

  if (allSteps.length === 0) return null

  const currentStep = allSteps[stepIndex]
  const totalSteps = allSteps.length
  const isPlanStep = currentStep === 'plan'

  const next = () => {
    if (stepIndex + 1 < allSteps.length) setStepIndex(stepIndex + 1)
    else onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4 py-8">
      <div className={`w-full rounded-2xl border border-border bg-background shadow-2xl overflow-y-auto max-h-[90vh] transition-all duration-300 ${isPlanStep ? 'max-w-5xl p-10' : 'max-w-md p-8'}`}>

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
            Step {stepIndex + 1} of {totalSteps}
          </p>
        )}

        {currentStep === 'tos' && <TosStep onNext={next} />}
        {currentStep === 'plan' && <PlanStep onSkip={next} />}
        {currentStep === 'stripe' && <StripeStep onComplete={next} />}
      </div>
    </div>
  )
}
