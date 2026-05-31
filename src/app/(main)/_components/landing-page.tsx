import Link from 'next/link'
import { PricingSection } from '@/components/layout/pricing-section'

export function LandingPage() {
  return (
    <div className="bg-background text-foreground">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 pt-24 pb-20">
        <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase mb-8">
          Rare US coins
        </p>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-8">
          The place to buy<br className="hidden sm:block" /> and sell rare<br className="hidden sm:block" /> US coins.
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-10 leading-relaxed">
          Every coin certified by PCGS or NGC. Every transaction protected by escrow.
          Built for serious collectors.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="https://my.pedigreecoins.com/listings"
            className="inline-flex items-center justify-center rounded-xl bg-foreground text-background text-sm font-semibold h-12 px-7 hover:opacity-85 transition-opacity"
          >
            Browse Coins
          </Link>
          <Link
            href="https://my.pedigreecoins.com/auth/register"
            className="inline-flex items-center justify-center rounded-xl border border-border text-sm font-semibold h-12 px-7 hover:bg-muted transition-colors"
          >
            Start Selling
          </Link>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Trust bar ────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          {[
            'PCGS & NGC certified',
            'Secure escrow payments',
            'Buyer protection on every order',
            'Fixed price and live auctions',
          ].map(item => (
            <span key={item} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── For buyers / For sellers ─────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20 grid sm:grid-cols-2 gap-16">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">For buyers</p>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Shop with confidence.</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Every listing includes a certified grade, population data, and price history. Your payment is held in escrow until your coin arrives.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              'Browse certified coins from trusted sellers',
              'Bid at live auction or buy at a fixed price',
              'Dispute protection if something goes wrong',
              'Want list - get notified when your coin is listed',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">For sellers</p>
          <h2 className="text-2xl font-bold tracking-tight mb-4">List in minutes.</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Enter your cert number and your listing is live. Pedigree Coins handles payments, shipping labels, and payouts automatically.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              'Cert number auto-fills coin details',
              'Fixed price or auction with reserve',
              'Payout released 48 hours after delivery',
              'No listing fees on the free plan',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/30 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-10">How it works</p>
        <div className="grid sm:grid-cols-3 gap-10">
          {[
            {
              step: '01',
              title: 'Create an account',
              desc: 'Sign up free. No subscription required to browse or buy.',
            },
            {
              step: '02',
              title: 'Find or list a coin',
              desc: 'Search by series, grade, or cert number. Sellers enter a cert and go live in minutes.',
            },
            {
              step: '03',
              title: 'Buy or sell securely',
              desc: 'Payments held in escrow. Shipping tracked. Payout released on delivery.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step}>
              <p className="text-3xl font-bold text-muted-foreground/20 mb-4 tabular-nums">{step}</p>
              <p className="font-semibold mb-2">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── Divider ──────────────────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-24 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Ready to get started?
        </h2>
        <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
          Join collectors and dealers buying and selling rare US coins.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="https://my.pedigreecoins.com/auth/register"
            className="inline-flex items-center justify-center rounded-xl bg-foreground text-background text-sm font-semibold h-12 px-8 hover:opacity-85 transition-opacity"
          >
            Create a free account
          </Link>
          <Link
            href="https://my.pedigreecoins.com/listings"
            className="inline-flex items-center justify-center rounded-xl border border-border text-sm font-semibold h-12 px-8 hover:bg-muted transition-colors"
          >
            Browse listings
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Pedigree Coins</p>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
