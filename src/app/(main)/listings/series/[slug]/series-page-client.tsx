'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCents, imgUrl } from '@/lib/utils'
import { Clock } from 'lucide-react'
import { SeriesSidebar } from '../../_components/series-sidebar'
import { SeriesFilters } from '../../_components/series-filters'
import { AuctionCountdown } from '@/components/ui/auction-countdown'
import { WatchButton } from '@/components/listings/watch-button'

type AuctionRow = {
  id: string
  current_bid: number | null
  start_price: number | null
  end_time: string | null
  bid_count: number
  reserve_price: number | null
}

type Listing = {
  id: string
  title: string | null
  coin_name: string | null
  grade: string | null
  grading_service: string | null
  cert_number: string | null
  year: number | null
  mint_mark: string | null
  price: number | null
  start_price: number | null
  listing_type: string | null
  images: string[] | null
  created_at: string | null
  auctions: AuctionRow[] | AuctionRow | null
}

type SeriesInfo = {
  name: string
  dateRange: string
  denomination?: string
  notes?: string
}

type Props = {
  allListings: Listing[]
  catalogYears: number[]
  availableMintMarks: (string | null)[]
  availableServices: string[]
  series: SeriesInfo
}

export function SeriesPageClient({
  allListings,
  catalogYears,
  availableMintMarks,
  availableServices,
  series,
}: Props) {
  const searchParams = useSearchParams()

  const year = searchParams.get('year') ?? 'all'
  const mint = searchParams.get('mint') ?? 'all'
  const service = searchParams.get('service') ?? 'all'
  const listingType = searchParams.get('type') ?? 'all'
  const sort = searchParams.get('sort') ?? 'newest'
  const q = searchParams.get('q') ?? ''

  const yearCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (const l of allListings) {
      if (l.year) counts[l.year] = (counts[l.year] ?? 0) + 1
    }
    return counts
  }, [allListings])

  const mintCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of allListings) {
      const mk = l.mint_mark ?? 'none'
      counts[mk] = (counts[mk] ?? 0) + 1
    }
    return counts
  }, [allListings])

  const listings = useMemo(() => {
    let result = allListings

    if (year !== 'all') {
      result = result.filter(l => l.year === parseInt(year))
    }
    if (mint !== 'all') {
      const mintValue = mint === 'none' ? null : mint
      result = result.filter(l => (l.mint_mark ?? null) === mintValue)
    }
    if (service !== 'all') {
      result = result.filter(l => l.grading_service === service)
    }
    if (listingType !== 'all') {
      result = result.filter(l => l.listing_type === listingType)
    }
    if (q) {
      const lq = q.toLowerCase()
      result = result.filter(l =>
        (l.title ?? '').toLowerCase().includes(lq) ||
        (l.grade ?? '').toLowerCase().includes(lq) ||
        (l.cert_number ?? '').toLowerCase().includes(lq) ||
        (l.coin_name ?? '').toLowerCase().includes(lq)
      )
    }

    if (sort === 'price-asc') {
      return [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    } else if (sort === 'price-desc') {
      return [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    } else if (sort === 'year-asc') {
      return [...result].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    } else if (sort === 'year-desc') {
      return [...result].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    } else {
      return [...result].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      )
    }
  }, [allListings, year, mint, service, listingType, q, sort])

  const totalCount = allListings.length
  const filteredCount = listings.length

  return (
    <>
      {/* Series header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{series.name}</h1>
            <p className="text-muted-foreground mt-1">
              {series.dateRange}
              {series.denomination && (
                <> · <span className="font-mono">{series.denomination}</span></>
              )}
              {series.notes && <> · <span className="italic">{series.notes}</span></>}
            </p>
          </div>
          {totalCount > 0 && (
            <span className="flex-none mt-1 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {filteredCount !== totalCount
                ? `${filteredCount} of ${totalCount} listing${totalCount !== 1 ? 's' : ''}`
                : `${totalCount} listing${totalCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-8 items-start">
        <SeriesSidebar
          availableMintMarks={availableMintMarks}
          catalogYears={catalogYears}
          yearCounts={yearCounts}
          mintCounts={mintCounts}
        />

        <main className="flex-1 min-w-0">
          <SeriesFilters availableServices={availableServices} />

          {listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((listing, idx) => {
                const obverse = listing.images?.[0] ?? null
                const reverse = listing.images?.[1] ?? null
                return (
                  <Link key={listing.id} href={`/listings/${listing.id}`}>
                    <Card className="group overflow-hidden hover:shadow-xl hover:border-foreground/20 transition-all h-full bg-background">
                      <div className="aspect-square relative overflow-hidden flex bg-white dark:bg-zinc-50">
                        {obverse ? (
                          <>
                            <div className={`relative flex-none overflow-hidden transition-[width] duration-300 ease-in-out bg-zinc-50 dark:bg-zinc-900 ${reverse ? 'w-full group-hover:w-1/2' : 'w-full'}`}>
                              <img
                                src={imgUrl(obverse, 600)}
                                alt={listing.title ?? ''}
                                loading={idx < 4 ? 'eager' : 'lazy'}
                                // @ts-ignore
                                fetchpriority={idx < 4 ? 'high' : 'auto'}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                            {reverse && (
                              <div className="relative flex-none w-0 group-hover:w-1/2 overflow-hidden transition-[width] duration-300 ease-in-out bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800">
                                <img
                                  src={imgUrl(reverse, 600)}
                                  alt={`${listing.title ?? ''} reverse`}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bg-muted">
                            No image
                          </div>
                        )}

                        {listing.listing_type === 'auction' && (
                          <div className="absolute top-2 left-2 z-10">
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Clock className="h-2.5 w-2.5" /> Auction
                            </Badge>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 z-10">
                          <WatchButton
                            listingId={listing.id}
                            className="h-7 w-7 bg-background/80 backdrop-blur-sm rounded-full shadow-sm"
                          />
                        </div>
                      </div>

                      <CardContent className="p-3 border-t border-border">
                        <p className="text-xs text-muted-foreground font-mono mb-0.5">
                          {listing.grading_service} · {listing.grade}
                          {listing.year && <> · {listing.year}</>}
                          {listing.mint_mark && <>{listing.mint_mark}</>}
                        </p>
                        <p className="text-sm font-medium leading-snug line-clamp-2 mb-2">
                          {listing.title}
                        </p>
                        {listing.listing_type === 'auction' ? (() => {
                          const auc = Array.isArray(listing.auctions) ? listing.auctions[0] : listing.auctions as AuctionRow | null
                          const currentBid = auc?.current_bid ?? null
                          const startPrice = auc?.start_price ?? listing.start_price ?? listing.price
                          const endTime = auc?.end_time ?? null
                          const bidCount = auc?.bid_count ?? 0
                          const binPrice = listing.price
                          return (
                            <div className="space-y-1">
                              <p className="text-sm font-bold">
                                {currentBid != null
                                  ? <>{formatCents(currentBid)} <span className="text-xs font-normal text-muted-foreground">({bidCount} bid{bidCount !== 1 ? 's' : ''})</span></>
                                  : <>Starts at <span className="font-bold">{formatCents(startPrice)}</span></>
                                }
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {endTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <AuctionCountdown endTime={endTime} />
                                  </span>
                                )}
                                {binPrice && (
                                  <span>BIN: <span className="font-semibold text-foreground">{formatCents(binPrice)}</span></span>
                                )}
                              </div>
                            </div>
                          )
                        })() : (
                          <p className="text-sm font-bold">{formatCents(listing.price)}</p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
              <p className="text-lg font-medium mb-2">No coins listed yet in this series</p>
              <p className="text-sm mb-4">Be the first to list a {series.name}.</p>
              <Link
                href="/listings/new"
                className="inline-block text-sm font-medium underline underline-offset-4 hover:text-foreground transition-colors"
              >
                List a coin →
              </Link>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
              <p className="text-base font-medium mb-1">No listings match your filters</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
