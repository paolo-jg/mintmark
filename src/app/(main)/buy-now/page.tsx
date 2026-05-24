import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { BuyNowClient } from './_components/buy-now-client'
import type { BuyNowListing } from './_components/buy-now-client'

export default async function BuyNowPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('listings')
    .select('id, title, coin_name, grading_service, grade, year, mint_mark, denomination, verification_status, images, price, series_slug, created_at')
    .eq('status', 'active')
    .eq('listing_type', 'fixed')
    .order('created_at', { ascending: false })
    .limit(96)

  const listings: BuyNowListing[] = (raw ?? []) as BuyNowListing[]

  const serviceDb = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: wishlistCounts } = await serviceDb
    .from('collection_items')
    .select('series_slug, user_id')
    .eq('type', 'wishlist')
    .not('series_slug', 'is', null)

  const wishlistMap: Record<string, number> = {}
  if (wishlistCounts) {
    const seen = new Map<string, Set<string>>()
    for (const row of wishlistCounts) {
      if (!row.series_slug) continue
      if (!seen.has(row.series_slug)) seen.set(row.series_slug, new Set())
      seen.get(row.series_slug)!.add(row.user_id)
    }
    for (const [slug, users] of seen) {
      wishlistMap[slug] = users.size
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Buy Now</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {listings.length > 0
              ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} available at fixed price`
              : 'No fixed-price listings right now. Check back soon.'}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
        >
          List a Coin
        </Link>
      </div>

      <BuyNowClient listings={listings} wishlistCounts={wishlistMap} />

    </div>
  )
}
