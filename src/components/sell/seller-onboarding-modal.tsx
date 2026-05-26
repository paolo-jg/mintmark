'use client'

import { useState } from 'react'
import { FileText, Landmark, ArrowRight, Loader2, CheckCircle2, ExternalLink, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

type Tier = 'collector_basic' | 'collector_standard' | 'collector_premium' | 'dealer_basic' | 'dealer_standard' | 'dealer_premium'
type Group = 'collectors' | 'dealers'
type Billing = 'monthly' | 'annual'

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

function formatPrice(price: number | null, billing: Billing) {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

// ── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({ tier, billing, isCurrent = false }: {
  tier: typeof COLLECTOR_TIERS[0]
  billing: Billing
  isCurrent?: boolean
}) {
  const displayPrice = billing === 'annual' ? tier.annualPrice : tier.monthlyPrice
  const isFree = tier.monthlyPrice === null

  return (
    <div className={`relative flex flex-col rounded-xl border p-4 ${
      tier.highlighted ? 'border-foreground/30 shadow-md' : 'border-border bg-background'
    }`}>
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-foreground px-3 py-0.5 text-[11px] font-semibold text-background">
            Most popular
          </span>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-muted border border-border px-3 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Current plan
          </span>
        </div>
      )}

      {/* Name + price */}
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-0.5">{tier.fullName}</p>
      <h3 className="text-lg font-bold mb-3">{tier.name}</h3>

      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">
            {isFree ? 'Free' : formatPrice(displayPrice, billing)}
          </span>
          {!isFree && <span className="text-xs text-muted-foreground">/{billing === 'annual' ? 'yr' : 'mo'}</span>}
        </div>
        {billing === 'annual' && tier.annualSavings && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{tier.annualSavings}</p>
        )}
      </div>

      {isCurrent ? (
        <div className="w-full inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground mb-3">
          Current plan
        </div>
      ) : (
        <a
          href="/pricing"
          target="_blank"
          className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition-colors mb-3 ${
            tier.highlighted
              ? 'bg-foreground text-background border-foreground hover:opacity-90'
              : 'bg-background text-foreground border-border hover:bg-muted'
          }`}
        >
          Get started →
        </a>
      )}

      <div className="pt-3 border-t border-border space-y-1.5">
        {tier.features.map(f => (
          <div key={f} className="flex items-start gap-2">
            <Check className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-xs text-muted-foreground leading-snug"><FeatureText text={f} /></span>
          </div>
        ))}
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
  const [billing, setBilling] = useState<Billing>('monthly')

  const tiers = group === 'collectors' ? COLLECTOR_TIERS : DEALER_TIERS

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">Choose a plan</h2>
        <p className="text-sm text-muted-foreground">
          You're on the free plan. Upgrade for more listings and lower fees, or continue for free.
        </p>
      </div>

      {/* Group toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex rounded-2xl border border-border bg-muted/40 p-1.5 gap-1">
          {(['collectors', 'dealers'] as Group[]).map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-8 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling('monthly')}
          className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors ${billing === 'annual' ? 'bg-foreground' : 'bg-muted'}`}
          role="switch"
          aria-checked={billing === 'annual'}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${billing === 'annual' ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={`text-sm font-medium transition-colors ${billing === 'annual' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Annual
          <span className="ml-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
            Save up to 17%
          </span>
        </button>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-3 gap-5">
        {tiers.map(tier => (
          <TierCard
            key={tier.key}
            tier={tier as typeof COLLECTOR_TIERS[0]}
            billing={billing}
            isCurrent={'isCurrent' in tier ? tier.isCurrent : false}
          />
        ))}
      </div>

      {/* Skip */}
      <div className="border-t border-border pt-4">
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
      <div className={`w-full rounded-2xl border border-border bg-background shadow-2xl p-8 overflow-y-auto max-h-[90vh] transition-all duration-300 ${isPlanStep ? 'max-w-5xl' : 'max-w-md'}`}>

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
