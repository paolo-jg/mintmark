import { createClient as createServiceClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { Gavel } from 'lucide-react'
import { AuctionsClient } from './_components/auctions-client'
import type { AuctionRow } from './_components/auctions-client'

const getAuctionsData = unstable_cache(
  async () => {
    const serviceDb = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const [{ data: raw }, { data: wishlistCounts }] = await Promise.all([
      serviceDb
        .from('auctions')
        .select('*, listing:listings(id, title, coin_name, grading_service, grade, year, mint_mark, denomination, verification_status, images, series_slug)')
        .gt('end_time', new Date().toISOString())
        .limit(96),
      serviceDb
        .from('collection_items')
        .select('series_slug, user_id')
        .eq('type', 'wishlist')
        .not('series_slug', 'is', null),
    ])

    const wishlistMap: Record<string, number> = {}
    if (wishlistCounts) {
      const seen = new Map<string, Set<string>>()
      for (const row of wishlistCounts) {
        if (!row.series_slug) continue
        if (!seen.has(row.series_slug)) seen.set(row.series_slug, new Set())
        seen.get(row.series_slug)!.add(row.user_id)
      }
      for (const [slug, users] of seen) wishlistMap[slug] = users.size
    }

    const auctions: AuctionRow[] = (raw ?? []).filter(a => a.listing)
    return { auctions, wishlistMap }
  },
  ['auctions-live'],
  { revalidate: 30, tags: ['auctions'] }
)

export default async function AuctionsPage() {
  const { auctions, wishlistMap } = await getAuctionsData()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Live Auctions</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {auctions.length > 0
              ? `${auctions.length} active auction${auctions.length !== 1 ? 's' : ''}. Bid before time runs out.`
              : 'No live auctions right now. Check back soon.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          {/* Page toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
            <Link href="/buy-now" className="px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Buy Now
            </Link>
            <span className="px-4 py-2 bg-foreground text-background">Auctions</span>
          </div>
          <Link
            href="/listings"
            className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
          >
            Browse All
          </Link>
        </div>
      </div>

      <AuctionsClient auctions={auctions} wishlistCounts={wishlistMap} />

    </div>
  )
}
