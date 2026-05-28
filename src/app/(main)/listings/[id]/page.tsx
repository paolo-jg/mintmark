export const revalidate = 30

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Shield, ExternalLink, ChevronLeft, Copy, Star } from 'lucide-react'
import Link from 'next/link'
import { getVerifyUrl } from '@/lib/grading/index'
import { COIN_EDUCATION } from '@/lib/coins/coin-education'
import { ListingGallery } from './_components/listing-gallery'
import { ListingActions, type AuctionData } from './_components/listing-actions'
import { SetNavSection } from '@/components/layout/nav-context'
import { ReportListingButton } from './_components/report-listing-button'
import { MessageSellerButton } from './_components/message-seller-button'
import PriceHistoryChart from './_components/price-history-chart'

function formatGrade(grade: string | null): string {
  if (!grade) return ''
  return grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2')
}

const MINT_NAMES: Record<string, string> = {
  P:  'Philadelphia',
  D:  'Denver',
  S:  'San Francisco',
  O:  'New Orleans',
  CC: 'Carson City',
  W:  'West Point',
  C:  'Charlotte',
  M:  'Manila',
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: listing }, { data: auctionRow }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, profiles(username, dealer_verified, display_name, dealer_logo_url, average_rating, rating_count, subscription_tier, public_key)')
      .eq('id', id)
      .single(),
    supabase
      .from('auctions')
      .select('id, current_bid, start_price, end_time, bid_count, reserve_price')
      .eq('listing_id', id)
      .maybeSingle(),
  ])

  if (!listing) notFound()

  const isVerified = listing.verification_status === 'verified'
  const images: string[] = listing.images ?? []
  const isPcgs = listing.grading_service === 'PCGS'
  const verifyUrl = !isPcgs && listing.cert_number
    ? getVerifyUrl(listing.grading_service, listing.cert_number)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SetNavSection section="buy" />

      {/* Back */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Browse Coins
      </Link>

      {/* Main layout: gallery + details */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 xl:gap-16">

        {/* Left: Gallery */}
        <ListingGallery images={images} title={listing.title} />

        {/* Right: Details */}
        <div className="flex flex-col gap-6">

          {/* Grading service + grade */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
              {listing.grading_service
                ? `${listing.grading_service}${listing.grade ? ` · ${formatGrade(listing.grade)}` : ''}`
                : 'Ungraded'}
              {listing.cac_designation && <span className="ml-2 text-amber-600">· CAC</span>}
            </p>
            <h1 className="text-2xl font-bold leading-snug tracking-tight">{listing.title}</h1>
          </div>

          {/* Price — fixed-price listings only; auctions render live inside ListingActions */}
          {listing.listing_type !== 'auction' && (
            <div>
              <p className="text-3xl font-bold">{formatCents(listing.price)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(listing as any).shipping_type === 'flat' && (listing as any).shipping_price_cents
                  ? `+ ${formatCents((listing as any).shipping_price_cents)} shipping`
                  : 'Free shipping'}
              </p>
            </div>
          )}

          {/* Actions */}
          {(() => {
            const sellerProfile = listing.profiles as { subscription_tier?: string | null; public_key?: string | null } | null
            const sellerTier = sellerProfile?.subscription_tier ?? 'collector_basic'
            const sellerPublicKeyJwk: JsonWebKey | null = (() => {
              try {
                return sellerProfile?.public_key ? JSON.parse(sellerProfile.public_key) as JsonWebKey : null
              } catch {
                return null
              }
            })()
            const auction: AuctionData | null = auctionRow
              ? {
                  id:            auctionRow.id,
                  current_bid:   auctionRow.current_bid,
                  start_price:   auctionRow.start_price,
                  end_time:      auctionRow.end_time,
                  bid_count:     auctionRow.bid_count,
                  reserve_price: auctionRow.reserve_price ?? null,
                }
              : null
            return (
              <>
                <ListingActions
                  listing={{
                    id: listing.id,
                    price: listing.price,
                    coin_name: listing.coin_name,
                    seller_id: listing.seller_id,
                    status: listing.status,
                    listing_type: listing.listing_type,
                    pass_convenience_fee: listing.pass_convenience_fee ?? false,
                    accept_offers: listing.accept_offers ?? false,
                    collection_item_id: listing.collection_item_id ?? null,
                  }}
                  isOwner={false}
                  sellerTier={sellerTier}
                  auction={auction}
                />
                {listing.status === 'active' && (
                  <MessageSellerButton
                    listingId={listing.id}
                    sellerId={listing.seller_id}
                    sellerPublicKeyJwk={sellerPublicKeyJwk}
                  />
                )}
              </>
            )
          })()}

          <Separator />

          {/* Specifications */}
          {(() => {
            const profile = listing.coin_profile as {
              specs?: {
                designer?: string | null
                composition?: string | null
                diameter?: string | null
                weight?: string | null
              } | null
            } | null

            // Fall back to COIN_EDUCATION data when coin_profile.specs is missing
            const eduSpecs = listing.series_slug ? COIN_EDUCATION[listing.series_slug] : null
            const specs = {
              composition: profile?.specs?.composition ?? eduSpecs?.composition ?? null,
              diameter:    profile?.specs?.diameter    ?? eduSpecs?.diameter    ?? null,
              weight:      profile?.specs?.weight      ?? eduSpecs?.weight      ?? null,
              designer:    profile?.specs?.designer    ?? eduSpecs?.designer    ?? null,
            }

            const mintName = listing.mint_mark
              ? (MINT_NAMES[listing.mint_mark.toUpperCase()] ?? listing.mint_mark)
              : null

            const rows: { label: string; value: string }[] = []
            if (listing.coin_name) rows.push({ label: 'Coin Type', value: listing.coin_name })
            if (listing.year) rows.push({ label: 'Year', value: String(listing.year) })
            if (mintName) rows.push({ label: 'Mint', value: mintName })
            if (listing.denomination) rows.push({ label: 'Denomination', value: listing.denomination })
            if (specs.composition) rows.push({ label: 'Composition', value: specs.composition })
            if (specs.diameter) rows.push({ label: 'Diameter', value: specs.diameter })
            if (specs.weight) rows.push({ label: 'Weight', value: specs.weight })
            if (specs.designer) rows.push({ label: 'Designer', value: specs.designer })
            if (listing.population_at_grade != null) rows.push({ label: 'Pop at grade', value: listing.population_at_grade.toLocaleString() })
            if (listing.population_above != null) rows.push({ label: 'Pop above', value: listing.population_above.toLocaleString() })

            if (rows.length === 0) return null
            return (
              <div className="space-y-2.5 text-sm">
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Specifications</p>
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Verify Authenticity */}
          {listing.grading_service && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-border/60 flex items-center gap-2">
                <Shield className={`h-3.5 w-3.5 shrink-0 ${isVerified ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                  Verify Authenticity
                </p>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    {listing.grading_service}
                    {isVerified && <span className="ml-1.5 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Verified</span>}
                  </p>
                  {listing.cert_number && (
                    <p className="text-xs text-muted-foreground mt-0.5">Cert #{listing.cert_number}</p>
                  )}
                  {!listing.cert_number && (
                    <p className="text-xs text-muted-foreground mt-0.5">No cert number provided</p>
                  )}
                </div>
                {(isPcgs && listing.cert_number) ? (
                  <a
                    href={`https://www.pcgs.com/cert/${listing.cert_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                  >
                    Verify on PCGS <ExternalLink className="h-3 w-3" />
                  </a>
                ) : verifyUrl ? (
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                  >
                    Verify on {listing.grading_service} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : listing.cert_number ? (
                  <button
                    onClick={() => navigator.clipboard.writeText(listing.cert_number!).then(() => {})}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                  >
                    <Copy className="h-3 w-3" /> Copy Cert #
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Seller's Description</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
              </div>
            </>
          )}

          {/* Price History */}
          {listing.grade && listing.grading_service && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Price History</p>
                <PriceHistoryChart
                  coinName={listing.coin_name ?? null}
                  year={listing.year ?? null}
                  mintMark={listing.mint_mark ?? null}
                  grade={listing.grade}
                  seriesSlug={(listing as any).series_slug ?? null}
                />
              </div>
            </>
          )}

          {/* Report listing */}
          {listing.status === 'active' && (
            <div className="flex justify-end">
              <ReportListingButton listingId={listing.id} />
            </div>
          )}

          {/* Seller */}
          <Separator />
          <Link
            href={`/sellers/${listing.seller_id}`}
            className="flex items-center justify-between text-sm hover:bg-muted/40 -mx-2 px-2 py-2 rounded-lg transition-colors"
          >
            <span className="text-muted-foreground">Sold by</span>
            <div className="flex items-center gap-2">
              {(() => {
                const p = listing.profiles as typeof listing.profiles & {
                  display_name?: string | null
                  average_rating?: number | null
                  rating_count?: number | null
                  subscription_tier?: string | null
                } | null
                const sellerName = p?.display_name ?? `@${p?.username ?? 'seller'}`
                const isDealer = p?.subscription_tier === 'dealer'
                const rating = p?.average_rating ?? 0
                const ratingCount = p?.rating_count ?? 0
                return (
                  <>
                    <span className="font-medium">{sellerName}</span>
                    {isDealer && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Dealer
                      </Badge>
                    )}
                    {ratingCount > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-foreground text-foreground" />
                        {rating.toFixed(1)}
                      </span>
                    )}
                  </>
                )
              })()}
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}
