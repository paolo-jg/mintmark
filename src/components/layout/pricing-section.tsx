'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type BillingCycle = 'monthly' | 'annual'

interface Tier {
  name: string
  monthlyPrice: number | null
  annualPrice: number | null
  description: string
  features: string[]
  highlighted?: boolean
  annualSavings?: string
}

const tiers: Tier[] = [
  {
    name: 'Collector Basic',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For casual collectors just getting started.',
    features: [
      '5% buy & sell fees',
      '$0.50 per listing',
      'Up to 10 active listings/month',
      'Unlimited purchases',
    ],
  },
  {
    name: 'Collector Standard',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    description: 'For collectors who list more regularly.',
    features: [
      '3.5% buy & sell fees',
      '$0.40 per listing',
      'Up to 50 active listings/month',
      'Unlimited purchases',
    ],
    highlighted: true,
    annualSavings: 'Save $19.89/yr',
  },
  {
    name: 'Collector Premium',
    monthlyPrice: 49,
    annualPrice: 499,
    description: 'For serious collectors with large inventories.',
    features: [
      '2.5% buy & sell fees',
      '$0.30 per listing',
      'Up to 200 active listings/month',
      'Unlimited purchases',
    ],
    annualSavings: 'Save $89/yr',
  },
  {
    name: 'Dealer Basic',
    monthlyPrice: 299,
    annualPrice: 2999,
    description: 'For dealers ready to scale without limits.',
    features: [
      '2.5% buy & sell fees',
      '$0.20 per listing',
      'Unlimited listings',
      'Unlimited purchases',
    ],
    annualSavings: 'Save $589/yr',
  },
  {
    name: 'Dealer Standard',
    monthlyPrice: 599,
    annualPrice: 5999,
    description: 'For established dealers moving serious volume.',
    features: [
      '1% sell fee / 2% buy fee',
      '$0.10 per listing',
      'Unlimited listings',
      'Unlimited purchases',
    ],
    annualSavings: 'Save $1,189/yr',
  },
  {
    name: 'Dealer Premium',
    monthlyPrice: 999,
    annualPrice: 9999,
    description: 'Maximum savings for the highest-volume dealers.',
    features: [
      '0% sell fee / 1% buy fee',
      '$0 per listing',
      'Unlimited listings',
      'Unlimited purchases',
    ],
    annualSavings: 'Save $1,989/yr',
  },
]

const competitors = [
  {
    name: 'Pedigree Coins',
    plan: 'Collector Basic',
    sellerFee: '5%',
    listingFee: '$0.50',
    buyerPremium: '—',
    note: 'No buyer premium',
  },
  {
    name: 'eBay',
    plan: 'Coins Category',
    sellerFee: '~12.35%',
    listingFee: '$0.35',
    buyerPremium: '—',
    note: 'Final value fee',
  },
  {
    name: 'Heritage Auctions',
    plan: 'All tiers',
    sellerFee: 'varies',
    listingFee: '—',
    buyerPremium: '20%',
    note: "Buyer's premium",
  },
  {
    name: 'PCGS Coin Exchange',
    plan: 'Marketplace',
    sellerFee: 'varies',
    listingFee: 'varies',
    buyerPremium: '—',
    note: 'Contact for rates',
  },
]

function formatPrice(price: number | null): string {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

export function PricingSection() {
  const [billing, setBilling] = useState<BillingCycle>('monthly')

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight mb-3">Simple, transparent pricing</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start free as a collector, or upgrade to a dealer plan when you&apos;re ready to scale.
          No hidden fees. What you see is what you pay.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm font-medium cursor-pointer select-none transition-colors ${
            billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setBilling('monthly')}
        >
          Monthly
        </span>
        <button
          onClick={() => setBilling(billing === 'monthly' ? 'annual' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            billing === 'annual' ? 'bg-primary' : 'bg-muted'
          }`}
          role="switch"
          aria-checked={billing === 'annual'}
          aria-label="Toggle annual billing"
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
              billing === 'annual' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium cursor-pointer select-none transition-colors ${
            billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setBilling('annual')}
        >
          Annual
          <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            Save up to 17%
          </span>
        </span>
      </div>

      {/* Pricing cards — Collector group */}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Collectors</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {tiers.filter(t => t.name.startsWith('Collector')).map((tier) => {
          const price = billing === 'annual' ? tier.annualPrice : tier.monthlyPrice
          const isFree = price === null
          const savings = billing === 'annual' ? tier.annualSavings : null

          return (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-shadow ${
                tier.highlighted
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-background'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                    Recommended
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-semibold text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-bold text-foreground">
                  {isFree ? 'Free' : formatPrice(price)}
                </span>
                {!isFree && (
                  <span className="text-sm text-muted-foreground ml-1">
                    /{billing === 'annual' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>

              {savings && (
                <p className="text-xs text-primary font-medium mb-4">{savings}</p>
              )}
              {!savings && <div className="mb-4" />}

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={tier.highlighted ? 'default' : 'outline'}
                className="w-full"
                render={<Link href="/auth/register" />}
              >
                Get Started
              </Button>
            </div>
          )
        })}
      </div>

      {/* Pricing cards — Dealer group */}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Dealers</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {tiers.filter(t => t.name.startsWith('Dealer')).map((tier) => {
          const price = billing === 'annual' ? tier.annualPrice : tier.monthlyPrice
          const isFree = price === null
          const savings = billing === 'annual' ? tier.annualSavings : null

          return (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-2xl border border-border bg-background p-6 transition-shadow"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-foreground mb-1">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </div>

              <div className="mb-1">
                <span className="text-3xl font-bold text-foreground">
                  {isFree ? 'Free' : formatPrice(price)}
                </span>
                {!isFree && (
                  <span className="text-sm text-muted-foreground ml-1">
                    /{billing === 'annual' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>

              {savings && (
                <p className="text-xs text-primary font-medium mb-4">{savings}</p>
              )}
              {!savings && <div className="mb-4" />}

              <ul className="space-y-2 mb-6 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full"
                render={<Link href="/auth/register" />}
              >
                Get Started
              </Button>
            </div>
          )
        })}
      </div>

      {/* Fee comparison table */}
      <div className="rounded-2xl border border-border bg-muted/30 p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-1">How we compare</h3>
          <p className="text-sm text-muted-foreground">
            Fee comparison shown for illustrative purposes using publicly available information.
            Competitor fees may vary by category, item value, and account type.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold text-foreground pb-3 pr-4">Platform</th>
                <th className="text-left font-semibold text-foreground pb-3 pr-4">Plan</th>
                <th className="text-left font-semibold text-foreground pb-3 pr-4">Seller Fee</th>
                <th className="text-left font-semibold text-foreground pb-3 pr-4">Listing Fee</th>
                <th className="text-left font-semibold text-foreground pb-3">Buyer Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {competitors.map((c, i) => (
                <tr key={c.name} className={i === 0 ? 'bg-primary/5' : ''}>
                  <td className="py-3 pr-4">
                    <span className={`font-semibold ${i === 0 ? 'text-primary' : 'text-foreground'}`}>
                      {c.name}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.plan}</td>
                  <td className="py-3 pr-4 text-foreground">{c.sellerFee}</td>
                  <td className="py-3 pr-4 text-foreground">{c.listingFee}</td>
                  <td className="py-3 text-foreground">{c.buyerPremium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
