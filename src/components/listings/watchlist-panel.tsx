'use client'

import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatCents } from '@/lib/utils'
import { Heart, Package } from 'lucide-react'
import { WatchButton } from './watch-button'

interface WatchedListing {
  id: string
  title: string | null
  price: number | null
  listing_type: string | null
  status: string | null
  images: string[] | null
  grade: string | null
  grading_service: string | null
  year: number | null
}

async function fetchWatchlist(): Promise<WatchedListing[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows } = await supabase
    .from('listing_watchlist')
    .select('listing_id, listings(id, title, price, listing_type, status, images, grade, grading_service, year)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (rows ?? [])
    .map((r: { listing_id: string; listings: WatchedListing | WatchedListing[] | null }) => {
      const l = Array.isArray(r.listings) ? r.listings[0] : r.listings
      return l ?? null
    })
    .filter((l): l is WatchedListing => l !== null && l.status === 'active')
}

export function WatchlistPanel() {
  const { data: listings, isLoading } = useSWR('watchlist', fetchWatchlist, { keepPreviousData: true })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-square bg-muted" />
            <div className="p-2.5 space-y-1.5">
              <div className="h-2.5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!listings?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
        <Heart className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">No watched listings</p>
        <p className="text-xs text-muted-foreground/70">Tap the heart on any listing to save it here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {listings.map(listing => (
        <Link
          key={listing.id}
          href={`/listings/${listing.id}`}
          className="group relative block rounded-xl border border-border bg-card overflow-hidden hover:border-foreground/20 hover:shadow-md transition-all"
        >
          <div className="aspect-square relative bg-muted">
            {listing.images?.[0] ? (
              <Image
                src={listing.images[0]}
                alt={listing.title ?? ''}
                fill
                sizes="200px"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute top-1.5 right-1.5">
              <WatchButton
                listingId={listing.id}
                className="h-7 w-7 bg-background/80 backdrop-blur-sm rounded-full shadow-sm"
              />
            </div>
          </div>
          <div className="p-2.5">
            <p className="text-[11px] text-muted-foreground font-mono mb-0.5">
              {[listing.grading_service, listing.grade, listing.year].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1">{listing.title}</p>
            <p className="text-sm font-bold">{listing.price ? formatCents(listing.price) : 'Auction'}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
