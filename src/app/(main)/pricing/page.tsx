import { PricingTabs } from './_components/pricing-tabs'

export const metadata = {
  title: 'Pricing — Pedigree Coins',
}

const COMPETITORS = [
  { name: 'Pedigree Coins', plan: 'Collector Basic', sellerFee: '5%', listingFee: '$0.50', buyerPremium: 'None', highlight: true },
  { name: 'eBay', plan: 'Coins Category', sellerFee: '~12.35%', listingFee: '$0.35', buyerPremium: 'None', highlight: false },
  { name: 'Heritage Auctions', plan: 'All tiers', sellerFee: 'varies', listingFee: 'None', buyerPremium: '20%+', highlight: false },
  { name: 'PCGS Coin Exchange', plan: 'Marketplace', sellerFee: 'varies', listingFee: 'varies', buyerPremium: 'None', highlight: false },
]

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free as a collector, or upgrade to a dealer plan when you&apos;re ready to scale.
          No hidden fees. What you see is what you pay.
        </p>
      </div>

      {/* Tabbed tier cards (client component) */}
      <PricingTabs />

      {/* Comparison table */}
      <div className="mt-20 rounded-2xl border border-border bg-muted/30 p-8">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-1">How we compare</h3>
          <p className="text-sm text-muted-foreground">
            Based on publicly available rates. Competitor fees may vary by category and item value.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-semibold pb-3 pr-6">Platform</th>
                <th className="text-left font-semibold pb-3 pr-6">Plan</th>
                <th className="text-left font-semibold pb-3 pr-6">Seller Fee</th>
                <th className="text-left font-semibold pb-3 pr-6">Listing Fee</th>
                <th className="text-left font-semibold pb-3">Buyer Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPETITORS.map((c) => (
                <tr key={c.name} className={c.highlight ? 'bg-foreground/5' : ''}>
                  <td className={`py-3 pr-6 font-semibold ${c.highlight ? '' : 'text-muted-foreground'}`}>{c.name}</td>
                  <td className="py-3 pr-6 text-muted-foreground">{c.plan}</td>
                  <td className="py-3 pr-6">{c.sellerFee}</td>
                  <td className="py-3 pr-6">{c.listingFee}</td>
                  <td className="py-3">{c.buyerPremium}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ nudge */}
      <p className="text-center text-sm text-muted-foreground mt-10">
        Questions about which plan is right for you?{' '}
        <a href="mailto:support@pedigreecoins.com" className="underline underline-offset-4 hover:text-foreground transition-colors">
          Contact us
        </a>
      </p>

    </div>
  )
}
