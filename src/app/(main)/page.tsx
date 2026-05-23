import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, TrendingUp, Clock, List } from 'lucide-react'

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6">Only professionally graded coins</Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
          The marketplace for<br />
          <span className="text-muted-foreground">rare, verified coins</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Every coin on Pedigree Coins is certified by a professional grading service —
          PCGS, NGC, and more. Buy and sell with complete confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" render={<Link href="/listings" />}>
            Browse Coins
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/auctions" />}>
            Live Auctions
          </Button>
        </div>
      </section>

      {/* Trust features */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: 'Cert-verified listings',
                desc: 'PCGS and NGC cert numbers are verified against official APIs at time of listing.',
              },
              {
                icon: TrendingUp,
                title: 'Population & price data',
                desc: 'See how many coins exist at each grade and realized sale prices for every listing.',
              },
              {
                icon: Clock,
                title: 'Fixed price & auctions',
                desc: 'Buy now or bid in real-time auctions. Set a reserve price to protect your coin.',
              },
              {
                icon: List,
                title: 'Want list matching',
                desc: "List the coins you're hunting. Get notified when a matching coin is listed.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-2">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <p className="font-medium text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grading services */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-xl font-semibold mb-2">Accepted grading services</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Coins graded by PCGS and NGC are automatically verified. Others are listed with an unverified badge.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'PCGS', verified: true },
            { label: 'NGC', verified: true },
            { label: 'ANACS', verified: false },
            { label: 'ICG', verified: false },
            { label: 'SEGS', verified: false },
          ].map(({ label, verified }) => (
            <Card key={label} className="px-4 py-2">
              <CardContent className="p-0 flex items-center gap-2">
                <span className="font-mono font-semibold text-sm">{label}</span>
                <Badge variant={verified ? 'default' : 'secondary'} className="text-xs">
                  {verified ? 'Auto-verified' : 'Unverified'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 text-center">
        <div className="bg-muted rounded-2xl px-8 py-14">
          <h2 className="text-2xl font-bold mb-3">Ready to sell a coin?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a free account, enter your cert number, and your listing goes live in minutes.
          </p>
          <Button size="lg" render={<Link href="/auth/register" />}>
            Start Selling
          </Button>
        </div>
      </section>
    </div>
  )
}
