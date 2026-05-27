import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeriesBySlug } from '@/lib/coins/catalog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCents } from '@/lib/utils'
import { ChevronLeft, Clock } from 'lucide-react'
import { SeriesSidebar } from '../../_components/series-sidebar'

type SearchParams = {
  year?: string
  mint?: string
  service?: string
  type?: string
  sort?: string
}

export default async function SeriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const { year, mint, service, type: listingType, sort = 'newest' } = await searchParams

  const series = getSeriesBySlug(slug)
  if (!series) notFound()

  const supabase = await createClient()

  // Fetch all listings for this series.
  // Primary: series_slug (set on all new listings).
  // Fallback: coin_name prefix match — handles listings where series_slug is null
  //   AND listings whose coin_name includes the year/mint (e.g. "Draped Bust Half Cent 1803")
  //   which wouldn't match an exact .in() against coinNames.
  const { data: bySlug } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('series_slug', slug)

  // Build OR filter: coin_name ILIKE 'Morgan Dollar%' OR coin_name ILIKE 'Morgan Silver Dollar%' ...
  const nameFilter = series.coinNames
    .map(n => `coin_name.ilike.${n}%`)
    .join(',')

  const { data: byName } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .is('series_slug', null)
    .or(nameFilter)

  const seen = new Set<string>()
  const allListings = [...(bySlug ?? []), ...(byName ?? [])].filter(l => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    return true
  })

  // Derive available filter options from the full listing set
  const availableYears = [...new Set(
    (allListings ?? []).map(l => l.year).filter((y): y is number => y != null)
  )].sort((a, b) => b - a)

  const availableMintMarks = [...new Set(
    (allListings ?? []).map(l => l.mint_mark as string | null)
  )].sort((a, b) => {
    if (!a) return -1
    if (!b) return 1
    return a.localeCompare(b)
  })

  const availableServices = [...new Set(
    (allListings ?? []).map(l => l.grading_service).filter(Boolean)
  )].sort() as string[]

  // Apply filters in-memory
  let listings = allListings ?? []

  if (year && year !== 'all') {
    listings = listings.filter(l => l.year === parseInt(year))
  }
  if (mint && mint !== 'all') {
    const mintValue = mint === 'none' ? null : mint
    listings = listings.filter(l => (l.mint_mark ?? null) === mintValue)
  }
  if (service && service !== 'all') {
    listings = listings.filter(l => l.grading_service === service)
  }
  if (listingType && listingType !== 'all') {
    listings = listings.filter(l => l.listing_type === listingType)
  }

  // Sort
  if (sort === 'price-asc') {
    listings = [...listings].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  } else if (sort === 'price-desc') {
    listings = [...listings].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
  } else if (sort === 'year-asc') {
    listings = [...listings].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
  } else if (sort === 'year-desc') {
    listings = [...listings].sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  } else {
    // newest (default — already sorted by created_at desc from Supabase)
    listings = [...listings].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )
  }

  const totalCount = allListings?.length ?? 0
  const filteredCount = listings.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Browse Coins
      </Link>

      {/* Series header */}
      <div className="mb-8">
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
        {/* Sidebar */}
        <SeriesSidebar
          availableYears={availableYears}
          availableMintMarks={availableMintMarks}
          availableServices={availableServices}
        />

        {/* Listings */}
        <main className="flex-1 min-w-0">
          {listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {listings.map((listing, idx) => {
                const obverse = listing.images?.[0] ?? null
                const reverse = listing.images?.[1] ?? null
                return (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="group overflow-hidden hover:shadow-xl hover:border-foreground/20 transition-all h-full bg-background">
                    {/* Image area — clean, sharp, hover reveals reverse */}
                    <div className="aspect-square relative overflow-hidden flex bg-white dark:bg-zinc-50">
                      {obverse ? (
                        <>
                          {/* Obverse */}
                          <div className={`relative flex-none overflow-hidden transition-[width] duration-300 ease-in-out bg-white dark:bg-zinc-50 ${reverse ? 'w-full group-hover:w-1/2' : 'w-full'}`}>
                            <img
                              src={obverse}
                              alt={listing.title}
                              loading={idx < 4 ? 'eager' : 'lazy'}
                              // @ts-ignore — fetchpriority valid HTML, not yet in React typedefs
                              fetchpriority={idx < 4 ? 'high' : 'auto'}
                              className="absolute inset-0 w-full h-full object-contain p-3"
                            />
                          </div>
                          {/* Reverse */}
                          {reverse && (
                            <div className="relative flex-none w-0 group-hover:w-1/2 overflow-hidden transition-[width] duration-300 ease-in-out bg-white dark:bg-zinc-50 border-l border-zinc-100 dark:border-zinc-200">
                              <img
                                src={reverse}
                                alt={`${listing.title} reverse`}
                                className="absolute inset-0 w-full h-full object-contain p-3"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs bg-muted">
                          No image
                        </div>
                      )}

                      {/* Badges */}
                      {listing.listing_type === 'auction' && (
                        <div className="absolute top-2 left-2 z-10">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-2.5 w-2.5" /> Auction
                          </Badge>
                        </div>
                      )}
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
                      <p className="text-sm font-bold">
                        {listing.listing_type === 'auction'
                          ? `Bid from ${formatCents(listing.start_price ?? listing.price)}`
                          : formatCents(listing.price)}
                      </p>
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
              <p className="text-sm">Try clearing some filters to see more results.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
