export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Star, Store, Package, ShieldCheck } from 'lucide-react'
import { ReviewSection } from './_components/review-section'
import { StorefrontListings } from './_components/storefront-listings'
import type { Review, ReviewableOrder } from './_components/review-section'

const TIER_LABEL: Record<string, string> = {
  collector_basic:    'Free',
  collector_premium:  'Premium',
  dealer:             'Dealer',
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
      <span className="text-sm tabular-nums text-muted-foreground">
        {rating > 0 ? rating.toFixed(1) : 'No ratings'}
        {count > 0 ? ` (${count})` : ''}
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

  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id ?? null

  const [
    { data: profile },
    { data: listings },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, dealer_logo_url, dealer_banner_url, dealer_description, dealer_tagline, average_rating, rating_count, completed_orders_count, subscription_tier, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('listings')
      .select('id, title, price, listing_type, status, grade, grading_service, images, year, mint_mark')
      .eq('seller_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('id, rating, title, body, status, created_at')
      .eq('seller_id', id)
      .in('status', ['published', 'flagged'])
      .order('created_at', { ascending: false }),
  ])

  if (!profile) notFound()

  // Find orders this user can review
  let reviewableOrders: ReviewableOrder[] = []
  if (currentUserId && currentUserId !== id) {
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('id, amount, created_at')
      .eq('buyer_id', currentUserId)
      .eq('seller_id', id)
      .eq('status', 'complete')

    if (completedOrders?.length) {
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('order_id')
        .eq('reviewer_id', currentUserId)
        .in('order_id', completedOrders.map(o => o.id))

      const reviewedOrderIds = new Set((existingReviews ?? []).map((r: { order_id: string }) => r.order_id))
      reviewableOrders = completedOrders
        .filter(o => !reviewedOrderIds.has(o.id))
        .map(o => ({ id: o.id, amount: o.amount, created_at: o.created_at }))
    }
  }

  const isDealer = profile.subscription_tier === 'dealer'
  const name = profile.display_name ?? profile.email
  const memberSince = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null

  // ── Dealer storefront layout ─────────────────────────────────────────────────
  if (isDealer) {
    return (
      <div className="min-h-screen">
        {/* Hero banner */}
        <div className="relative w-full h-48 sm:h-64 bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
          {profile.dealer_banner_url ? (
            <img
              src={profile.dealer_banner_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-foreground/3 to-transparent" />
          )}
          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        {/* Header card — overlaps banner */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="-mt-16 relative z-10 mb-8">
            <div className="flex items-end gap-5">
              {/* Logo */}
              <div className="h-24 w-24 rounded-2xl overflow-hidden bg-background border-2 border-border shadow-lg flex-shrink-0 flex items-center justify-center">
                {profile.dealer_logo_url ? (
                  <img src={profile.dealer_logo_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10 text-muted-foreground/30" />
                )}
              </div>

              <div className="pb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
                  <Badge className="bg-foreground text-background text-[10px] font-bold tracking-wide gap-1">
                    <ShieldCheck className="h-3 w-3" /> Dealer
                  </Badge>
                </div>
                {profile.dealer_tagline && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{profile.dealer_tagline}</p>
                )}
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <span className="font-semibold tabular-nums">{listings?.length ?? 0}</span>
                <span className="text-muted-foreground ml-1">active listing{listings?.length !== 1 ? 's' : ''}</span>
              </div>
              {(profile.completed_orders_count ?? 0) > 0 && (
                <div>
                  <span className="font-semibold tabular-nums">{profile.completed_orders_count}</span>
                  <span className="text-muted-foreground ml-1">completed sale{profile.completed_orders_count !== 1 ? 's' : ''}</span>
                </div>
              )}
              {(profile.rating_count ?? 0) > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
                  <span className="font-semibold tabular-nums">{(profile.average_rating ?? 0).toFixed(1)}</span>
                  <span className="text-muted-foreground">({profile.rating_count} review{profile.rating_count !== 1 ? 's' : ''})</span>
                </div>
              )}
              {memberSince && (
                <div>
                  <span className="text-muted-foreground">Member since </span>
                  <span className="font-semibold">{memberSince}</span>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {profile.dealer_description && (
            <div className="rounded-2xl border border-border bg-card px-6 py-5 mb-8">
              <h2 className="text-sm font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {profile.dealer_description}
              </p>
            </div>
          )}

          {/* Listings */}
          <div className="mb-10">
            <h2 className="text-base font-semibold mb-4">
              Inventory
              {listings?.length ? (
                <span className="text-muted-foreground font-normal ml-2">({listings.length})</span>
              ) : null}
            </h2>
            <StorefrontListings listings={listings ?? []} />
          </div>

          {/* Reviews */}
          <ReviewSection
            sellerId={id}
            reviews={(reviews ?? []) as Review[]}
            reviewableOrders={reviewableOrders}
          />
        </div>
      </div>
    )
  }

  // ── Standard seller layout ───────────────────────────────────────────────────
  const tierLabel = TIER_LABEL[profile.subscription_tier] ?? profile.subscription_tier

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Profile header */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <div className="flex items-start gap-5">
          <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted border border-border flex-shrink-0 flex items-center justify-center">
            <Store className="h-7 w-7 text-muted-foreground/30" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{name}</h1>
              <Badge variant="secondary" className="text-xs">{tierLabel}</Badge>
            </div>

            <div className="mt-2">
              <StarRating rating={profile.average_rating ?? 0} count={profile.rating_count ?? 0} />
            </div>

            {(profile.completed_orders_count ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {profile.completed_orders_count} completed sale{profile.completed_orders_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="mb-10">
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
                <div className="aspect-square bg-muted border-b border-border flex items-center justify-center overflow-hidden">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/20" />
                  )}
                </div>
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

      {/* Reviews */}
      <ReviewSection
        sellerId={id}
        reviews={(reviews ?? []) as Review[]}
        reviewableOrders={reviewableOrders}
      />
    </div>
  )
}
