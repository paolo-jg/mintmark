import { Check } from 'lucide-react'
import Link from 'next/link'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

const COLLECTOR_TIERS = [
  {
    name: 'Collector Basic',
    monthlyPrice: null as number | null,
    annualPrice: null as number | null,
    description: 'For casual collectors just getting started.',
    features: ['7% buyer fee', '7% seller fee + card processing fees', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: null as string | null,
  },
  {
    name: 'Collector Standard',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    description: 'For collectors who list more regularly.',
    features: ['5% buyer fee', '5% seller fee + card processing fees', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    highlighted: true,
    annualSavings: 'Save $19.89/yr',
  },
  {
    name: 'Collector Premium',
    monthlyPrice: 49,
    annualPrice: 499,
    description: 'For serious collectors with large inventories.',
    features: ['3% buyer fee', '3% seller fee + card processing fees', '$0.30 per listing', 'Up to 200 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: 'Save $89/yr',
  },
]

const DEALER_TIERS = [
  {
    name: 'Dealer Basic',
    monthlyPrice: 299,
    annualPrice: 2999,
    description: 'For dealers ready to scale without limits.',
    features: ['2.5% buyer fee', '2.5% seller fee + card processing fees', '$0.20 per listing', 'Unlimited listings', 'Unlimited purchases'],
    annualSavings: 'Save $589/yr',
  },
  {
    name: 'Dealer Standard',
    monthlyPrice: 599,
    annualPrice: 5999,
    description: 'For established dealers moving serious volume.',
    features: ['2% buyer fee', '1% seller fee + card processing fees', '$0.10 per listing', 'Unlimited listings', 'Unlimited purchases'],
    annualSavings: 'Save $1,189/yr',
  },
  {
    name: 'Dealer Premium',
    monthlyPrice: 999,
    annualPrice: 9999,
    description: 'Maximum savings for the highest-volume dealers.',
    features: ['1% buyer fee', '0% seller fee + card processing fees', '$0 per listing', 'Unlimited listings', 'Unlimited purchases'],
    annualSavings: 'Save $1,989/yr',
  },
]

const COMPETITORS = [
  { name: 'Pedigree Coins', plan: 'Collector Basic', sellerFee: '5%', listingFee: '$0.50', buyerPremium: 'None', highlight: true },
  { name: 'eBay', plan: 'Coins Category', sellerFee: '~12.35%', listingFee: '$0.35', buyerPremium: 'None', highlight: false },
  { name: 'Heritage Auctions', plan: 'All tiers', sellerFee: 'varies', listingFee: 'None', buyerPremium: '20%+', highlight: false },
  { name: 'PCGS Coin Exchange', plan: 'Marketplace', sellerFee: 'varies', listingFee: 'varies', buyerPremium: 'None', highlight: false },
]

function fmt(price: number | null): string {
  if (price === null) return 'Free'
  if (Number.isInteger(price)) return `$${price}`
  return `$${price.toFixed(2)}`
}

function TierCard({ tier, isDealer = false }: {
  tier: typeof COLLECTOR_TIERS[0] | typeof DEALER_TIERS[0]
  isDealer?: boolean
}) {
  const highlighted = 'highlighted' in tier ? tier.highlighted : false
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${highlighted ? 'border-foreground/30 shadow-md' : 'border-border bg-background'}`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-block rounded-full bg-foreground px-3 py-0.5 text-xs font-semibold text-background">
            Recommended
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-semibold text-foreground mb-1">{tier.name}</h3>
        <p className="text-sm text-muted-foreground">{tier.description}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">{fmt(tier.monthlyPrice)}</span>
          {tier.monthlyPrice !== null && <span className="text-sm text-muted-foreground">/mo</span>}
        </div>
        {tier.annualPrice !== null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmt(tier.annualPrice)}/yr &middot; {'annualSavings' in tier && tier.annualSavings ? tier.annualSavings : ''}
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 text-foreground/60 mt-0.5 shrink-0" />
            <span><FeatureText text={f} /></span>
          </li>
        ))}
      </ul>

      <Link
        href="/auth/register"
        className={`inline-flex w-full items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
          highlighted
            ? 'bg-foreground text-background border-foreground hover:bg-foreground/90'
            : 'bg-background text-foreground border-border hover:bg-muted'
        }`}
      >
        Get Started
      </Link>
    </div>
  )
}

export function PricingSection() {
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight mb-3">Simple, transparent pricing</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start free as a collector, or upgrade to a dealer plan when you&apos;re ready to scale.
          No hidden fees. What you see is what you pay.
        </p>
      </div>

      {/* Collector tiers */}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Collectors</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {COLLECTOR_TIERS.map(tier => <TierCard key={tier.name} tier={tier} />)}
      </div>

      {/* Dealer tiers */}
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/60 mb-3">Dealers</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {DEALER_TIERS.map(tier => <TierCard key={tier.name} tier={tier} isDealer />)}
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl border border-border bg-muted/30 p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-1">How we compare</h3>
          <p className="text-sm text-muted-foreground">
            Based on publicly available rates. Competitor fees may vary.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold pb-3 pr-4">Platform</th>
                <th className="text-left font-semibold pb-3 pr-4">Plan</th>
                <th className="text-left font-semibold pb-3 pr-4">Seller Fee</th>
                <th className="text-left font-semibold pb-3 pr-4">Listing Fee</th>
                <th className="text-left font-semibold pb-3">Buyer Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPETITORS.map((c) => (
                <tr key={c.name} className={c.highlight ? 'bg-foreground/5' : ''}>
                  <td className="py-3 pr-4 font-semibold">{c.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.plan}</td>
                  <td className="py-3 pr-4">{c.sellerFee}</td>
                  <td className="py-3 pr-4">{c.listingFee}</td>
                  <td className="py-3">{c.buyerPremium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
