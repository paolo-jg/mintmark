import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Star, Store, Package } from 'lucide-react'

const TIER_LABEL: Record<string, string> = {
  collector_basic:    'Collector Basic',
  collector_standard: 'Collector Standard',
  collector_premium:  'Collector Premium',
  dealer_basic:       'Dealer Basic',
  dealer_standard:    'Dealer Standard',
  dealer_premium:     'Dealer Premium',
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} className="h-4 w-4 fill-foreground text-foreground" />
        ))}
        {half && (
          <span className="relative inline-block h-4 w-4">
            <Star className="absolute h-4 w-4 text-muted-foreground" />
            <span className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-foreground text-foreground" />
            </span>
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} className="h-4 w-4 text-muted-foreground" />
        ))}
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {rating > 0 ? rating.toFixed(1) : 'No ratings'}{count > 0 ? ` (${count} review${count !== 1 ? 's' : ''})` : ''}
      </span>
    </div>
  )
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: listings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, dealer_logo_url, dealer_description, average_rating, rating_count, subscription_tier')
      .eq('id', id)
      .single(),
    supabase
      .from('listings')
      .select('id, title, price, listing_type, status, grade, grading_service, images, year, mint_mark')
      .eq('seller_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  const isDealer = profile.subscription_tier?.startsWith('dealer_')
  const name = profile.display_name ?? profile.email
  const tierLabel = TIER_LABEL[profile.subscription_tier] ?? profile.subscription_tier

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <div className="flex items-start gap-5">
          {/* Logo (dealers) or placeholder */}
          <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
            {isDealer && profile.dealer_logo_url ? (
              <img
                src={profile.dealer_logo_url}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Store className="h-7 w-7 text-muted-foreground/30" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{name}</h1>
              <Badge variant="secondary" className="text-xs">
                {tierLabel}
              </Badge>
            </div>

            <div className="mt-2">
              <StarRating rating={profile.average_rating ?? 0} count={profile.rating_count ?? 0} />
            </div>

            {isDealer && profile.dealer_description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {profile.dealer_description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Active listings */}
      <div>
        <h2 className="text-base font-semibold mb-4">
          Active Listings
          {listings?.length ? (
            <span className="text-muted-foreground font-normal ml-2">({listings.length})</span>
          ) : null}
        </h2>

        {!listings?.length ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map(listing => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors overflow-hidden flex flex-col"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-muted border-b border-border flex items-center justify-center overflow-hidden">
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/20" />
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="text-xs font-semibold leading-snug line-clamp-2">{listing.title}</p>
                  {listing.grading_service && listing.grade && (
                    <p className="text-[10px] text-muted-foreground">
                      {listing.grading_service} · {listing.grade}
                    </p>
                  )}
                  <p className="text-sm font-bold mt-auto pt-1 tabular-nums">
                    {listing.listing_type === 'fixed' && listing.price
                      ? formatCents(listing.price)
                      : 'Auction'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
