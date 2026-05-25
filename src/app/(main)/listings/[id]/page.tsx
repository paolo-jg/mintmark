import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatCents } from '@/lib/utils'
import { Shield, ExternalLink, ChevronLeft, Copy, Star } from 'lucide-react'
import Link from 'next/link'
import { getVerifyUrl } from '@/lib/grading/index'
import { ListingGallery } from './_components/listing-gallery'
import { ListingActions } from './_components/listing-actions'

function formatGrade(grade: string | null): string {
  if (!grade) return ''
  return grade.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2')
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select('*, profiles(username, dealer_verified, display_name, dealer_logo_url, average_rating, rating_count, subscription_tier)')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const isOwner = user?.id === listing.seller_id
  const isVerified = listing.verification_status === 'verified'
  const images: string[] = listing.images ?? []
  const isPcgs = listing.grading_service === 'PCGS'
  const verifyUrl = !isPcgs && listing.cert_number
    ? getVerifyUrl(listing.grading_service, listing.cert_number)
    : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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

          {/* Price */}
          <div>
            {listing.listing_type === 'auction' ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current Bid</p>
                <p className="text-3xl font-bold">{formatCents(listing.start_price ?? listing.price)}</p>
              </div>
            ) : (
              <p className="text-3xl font-bold">{formatCents(listing.price)}</p>
            )}
          </div>

          {/* Actions */}
          {(() => {
            const sellerProfile = listing.profiles as { subscription_tier?: string | null } | null
            const sellerTier = sellerProfile?.subscription_tier ?? 'collector_basic'
            return (
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
                isOwner={isOwner}
                sellerTier={sellerTier}
              />
            )
          })()}

          <Separator />

          {/* Coin details */}
          {(() => {
            const profile = listing.coin_profile as {
              specs?: {
                designer?: string | null
                composition?: string | null
                diameter?: string | null
                weight?: string | null
              } | null
            } | null

            const specs = profile?.specs

            const rows: { label: string; value: string }[] = []
            if (listing.year) rows.push({ label: 'Year', value: `${listing.year}${listing.mint_mark ? `-${listing.mint_mark}` : ''}` })
            if (listing.denomination) rows.push({ label: 'Denomination', value: listing.denomination })
            if (specs?.composition) rows.push({ label: 'Composition', value: specs.composition })
            if (specs?.diameter) rows.push({ label: 'Diameter', value: specs.diameter })
            if (specs?.weight) rows.push({ label: 'Weight', value: specs.weight })
            if (specs?.designer) rows.push({ label: 'Designer', value: specs.designer })
            if (listing.population_at_grade != null) rows.push({ label: 'Pop at grade', value: listing.population_at_grade.toLocaleString() })
            if (listing.population_above != null) rows.push({ label: 'Pop above', value: listing.population_above.toLocaleString() })

            if (rows.length === 0) return null
            return (
              <div className="space-y-2.5 text-sm">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Cert section */}
          {listing.cert_number ? (
            <div className="rounded-xl border border-border px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Shield className={`h-4 w-4 shrink-0 ${isVerified ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">
                    {isVerified ? 'Verified by Pedigree Coins' : `Unverified (${listing.grading_service})`}
                  </p>
                  {isPcgs ? (
                    <a
                      href={`https://www.pcgs.com/cert/${listing.cert_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      Cert #{listing.cert_number} <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">Cert #{listing.cert_number}</p>
                  )}
                </div>
              </div>
              {verifyUrl && (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  Verify <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {!isPcgs && listing.cert_number && !verifyUrl && (
                <span className="text-xs text-muted-foreground shrink-0">
                  <Copy className="h-3 w-3 inline mr-1" />
                  {listing.cert_number}
                </span>
              )}
            </div>
          ) : listing.grading_service ? (
            <div className="rounded-xl border border-border px-4 py-3.5 flex items-center gap-2.5">
              <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {listing.grading_service} graded, no cert number provided
              </p>
            </div>
          ) : null}

          {/* Description */}
          {listing.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </>
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
                const isDealer = p?.subscription_tier?.startsWith('dealer_')
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
