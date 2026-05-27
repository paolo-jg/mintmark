import { Check } from 'lucide-react'
import Link from 'next/link'
import { FeatureText } from '@/components/ui/card-fee-tooltip'

const COLLECTOR_TIERS = [
  {
    name: 'Free',
    fullName: 'Collector Basic',
    monthlyPrice: null as number | null,
    annualPrice: null as number | null,
    description: 'Get listed and start buying and selling rare coins.',
    features: ['7% buyer fee', '7% seller fee + card processing fees', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    highlighted: false,
    annualSavings: null as string | null,
  },
  {
    name: 'Premium',
    fullName: 'Collector Premium',
    monthlyPrice: 9.99,
    annualPrice: null as number | null,
    description: 'Lower fees and more listings for active collectors.',
    features: ['1.9% buyer fee', '1.9% seller fee + card processing fees', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    highlighted: true,
    annualSavings: null as string | null,
  },
]

const DEALER_TIERS = [
  {
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

const ANNUAL_PRICES: Record<string, number | null> = {
  'Collector Basic': null,
  'Collector Premium': null,
  'Dealer': null,
}

const ANNUAL_SAVINGS: Record<string, string | null> = {
  'Collector Basic': null,
  'Collector Premium': null,
  'Dealer': null,
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

      <div className="mb-2 min-h-[4rem]">
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

      <div className="mt-6 pt-6 border-t border-border space-y-3 flex-1">
        {tier.features.map((f) => (
          <div key={f} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-foreground/8">
              <Check className="h-3 w-3 text-foreground/70" />
            </div>
            <span className="text-sm text-muted-foreground"><FeatureText text={f} /></span>
          </div>
        ))}
      </div>

      <Link
        href="/auth/register"
        className={`mt-8 inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
          tier.highlighted
            ? 'bg-foreground text-background border-foreground hover:bg-foreground/90'
            : 'bg-background text-foreground border-border hover:bg-muted'
        }`}
      >
        Get started →
      </Link>
    </div>
  )
}

export function PricingTabs() {
  const tiers = [...COLLECTOR_TIERS, ...DEALER_TIERS]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {tiers.map(tier => (
        <TierCard key={tier.fullName} tier={tier} billing="monthly" />
      ))}
    </div>
  )
}
