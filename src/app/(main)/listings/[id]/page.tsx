import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatCents } from '@/lib/utils'
import { Shield, ExternalLink, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { getVerifyUrl } from '@/lib/grading/index'
import { ListingGallery } from './_components/listing-gallery'

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
    .select('*, profiles(username, dealer_verified)')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const isOwner = user?.id === listing.seller_id
  const verifyUrl = getVerifyUrl(listing.grading_service, listing.cert_number)
  const isVerified = listing.verification_status === 'verified'
  const images: string[] = listing.images ?? []

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

        {/* ── Left: Gallery ── */}
        <ListingGallery images={images} title={listing.title} />

        {/* ── Right: Details ── */}
        <div className="flex flex-col gap-6">

          {/* Grading service + grade */}
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
              {listing.grading_service} · {listing.grade}
              {listing.cac_designation && <span className="ml-2 text-amber-600">· CAC</span>}
            </p>
            <h1 className="text-2xl font-bold leading-snug tracking-tight">{listing.title}</h1>
          </div>

          {/* Price */}
          <div>
            {listing.listing_type === 'auction' ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Current bid</p>
                <p className="text-3xl font-bold">{formatCents(listing.start_price ?? listing.price)}</p>
              </div>
            ) : (
              <p className="text-3xl font-bold">{formatCents(listing.price)}</p>
            )}
          </div>

          {/* Actions */}
          {!isOwner && listing.status === 'active' && (
            <div className="space-y-2.5">
              {listing.listing_type === 'auction' ? (
                <Button size="lg" className="w-full h-12 text-base">Place Bid</Button>
              ) : (
                <Button size="lg" className="w-full h-12 text-base">
                  Buy Now — {formatCents(listing.price)}
                </Button>
              )}
              <Button variant="outline" size="lg" className="w-full h-12 text-base">
                Make Offer
              </Button>
            </div>
          )}

          {isOwner && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground text-center">
              This is your listing
            </div>
          )}

          <Separator />

          {/* Coin details */}
          <div className="space-y-3 text-sm">
            {listing.year && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium">{listing.year}{listing.mint_mark ? `-${listing.mint_mark}` : ''}</span>
              </div>
            )}
            {listing.denomination && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Denomination</span>
                <span className="font-medium">{listing.denomination}</span>
              </div>
            )}
            {listing.population_at_grade != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pop at grade</span>
                <span className="font-medium tabular-nums">{listing.population_at_grade.toLocaleString()}</span>
              </div>
            )}
            {listing.population_above != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pop higher</span>
                <span className="font-medium tabular-nums">{listing.population_above.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Cert verification */}
          <div className="rounded-xl border border-border px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield className={`h-4 w-4 shrink-0 ${isVerified ? 'text-emerald-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-medium">
                  {isVerified ? 'Verified by Pedigree Coins' : `Unverified (${listing.grading_service})`}
                </p>
                <p className="text-xs text-muted-foreground">Cert #{listing.cert_number}</p>
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
          </div>

          {/* Description */}
          {listing.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            </>
          )}

          {/* Seller */}
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sold by</span>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">@{listing.profiles?.username ?? 'seller'}</span>
              {listing.profiles?.dealer_verified && (
                <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground border border-border rounded px-1.5 py-0.5">
                  Dealer
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
