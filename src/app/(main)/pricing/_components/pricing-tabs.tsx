'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

type Group = 'collectors' | 'dealers'

const COLLECTOR_TIERS = [
  {
    name: 'Basic',
    fullName: 'Collector Basic',
    monthlyPrice: null as number | null,
    annualPrice: null as number | null,
    description: 'Get listed and start buying and selling graded coins.',
    features: ['7% buyer fee', '7% seller fee + card processing fees', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: null as string | null,
  },
  {
    name: 'Standard',
    fullName: 'Collector Standard',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    description: 'Lower fees and more listings for active collectors.',
    features: ['5% buyer fee', '5% seller fee + card processing fees', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    highlighted: true,
    annualSavings: 'Save $19.89/yr',
  },
  {
    name: 'Premium',
    fullName: 'Collector Premium',
    monthlyPrice: 49,
    annualPrice: 499,
    description: 'Maximum listings and the lowest fees for serious collectors.',
    features: ['3% buyer fee', '3% seller fee + card processing fees', '$0.30 per listing', 'Up to 200 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: 'Save $89/yr',
  },
]

const DEALER_TIERS = [
  {
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

const ANNUAL_PRICES: Record<string, number | null> = {
  'Collector Basic': null,
  'Collector Standard': 99.99,
  'Collector Premium': 499,
  'Dealer Basic': 2999,
  'Dealer Standard': 5999,
  'Dealer Premium': 9999,
}

const ANNUAL_SAVINGS: Record<string, string | null> = {
  'Collector Basic': null,
  'Collector Standard': 'Save $19.89/yr',
  'Collector Premium': 'Save $89/yr',
  'Dealer Basic': 'Save $589/yr',
  'Dealer Standard': 'Save $1,189/yr',
  'Dealer Premium': 'Save $1,989/yr',
}

function formatPrice(price: number | null): string {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

function TierCard({ tier, billing }: {
  tier: typeof COLLECTOR_TIERS[0] | typeof DEALER_TIERS[0]
  billing: 'monthly' | 'annual'
}) {
  const annualPrice = ANNUAL_PRICES[tier.fullName]
  const annualSavings = ANNUAL_SAVINGS[tier.fullName]
  const displayPrice = billing === 'annual' ? annualPrice : tier.monthlyPrice
  const isFree = tier.monthlyPrice === null

  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 transition-shadow ${
      tier.highlighted ? 'border-foreground/30 shadow-lg' : 'border-border bg-background'
    }`}>
      {tier.highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-foreground px-4 py-1 text-xs font-semibold text-background">
            Most popular
          </span>
        </div>
      )}

      <div className="mb-2">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground/60 mb-1">{tier.fullName}</p>
        <h3 className="text-2xl font-bold text-foreground">{tier.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
      </div>

      <div className="mt-6 mb-2">
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold tracking-tight">
            {isFree ? 'Free' : formatPrice(displayPrice)}
          </span>
          {!isFree && (
            <span className="text-sm text-muted-foreground mb-1.5">/{billing === 'annual' ? 'yr' : 'mo'}</span>
          )}
        </div>
        {billing === 'annual' && annualSavings && (
          <p className="text-xs text-muted-foreground mt-1">{annualSavings}</p>
        )}
        {billing === 'monthly' && !isFree && annualPrice !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatPrice(annualPrice)}/yr billed annually
          </p>
        )}
      </div>

      <Link
        href="/auth/register"
        className={`mt-6 inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
          tier.highlighted
            ? 'bg-foreground text-background border-foreground hover:bg-foreground/90'
            : 'bg-background text-foreground border-border hover:bg-muted'
        }`}
      >
        Get started →
      </Link>

      <div className="mt-8 pt-6 border-t border-border space-y-3">
        {tier.features.map((f) => (
          <div key={f} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-foreground/8">
              <Check className="h-3 w-3 text-foreground/70" />
            </div>
            <span className="text-sm text-muted-foreground"><FeatureText text={f} /></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PricingTabs() {
  const [group, setGroup] = useState<Group>('collectors')
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const tiers = group === 'collectors' ? COLLECTOR_TIERS : DEALER_TIERS

  return (
    <div>
      {/* Group tabs */}
      <div className="flex items-center justify-center mb-10">
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

      {/* Group description */}
      <div className="text-center mb-8">
        {group === 'collectors' ? (
          <>
            <h2 className="text-2xl font-bold mb-2">Collector Plans</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Start free and upgrade as your collection grows. All plans include unlimited purchases and access to the full marketplace.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2">Dealer Plans</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Unlimited listings, a ranked dealer profile, and the lowest fees on the platform. Built for volume.
            </p>
          </>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setBilling('monthly')}
          className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors ${
            billing === 'annual' ? 'bg-foreground' : 'bg-muted'
          }`}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map(tier => (
          <TierCard key={tier.fullName} tier={tier} billing={billing} />
        ))}
      </div>
    </div>
  )
}
