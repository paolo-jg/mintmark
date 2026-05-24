import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Gavel, ChevronLeft, ShoppingBag } from 'lucide-react'
import { COIN_CATALOG, type CoinSeries } from '@/lib/coins/catalog'
import { ExploreFilters } from './_components/explore-filters'
import { DirectoryClient } from './_components/directory-client'
import { CoinCardImage } from './_components/coin-card-image'
import { placeholderGradient } from './_components/utils'

// ─── Composition mappings ────────────────────────────────────────────────────
const GOLD_SERIES = new Set([
  'liberty-head-gold-dollar', 'indian-princess-gold-dollar',
  'draped-bust-quarter-eagle', 'capped-bust-quarter-eagle',
  'classic-head-quarter-eagle', 'liberty-head-quarter-eagle', 'indian-head-quarter-eagle',
  'indian-princess-three-dollar-gold',
  'flowing-hair-stella', 'coiled-hair-stella',
  'draped-bust-half-eagle', 'capped-bust-half-eagle',
  'classic-head-half-eagle', 'liberty-head-half-eagle', 'indian-head-half-eagle',
  'draped-bust-eagle', 'liberty-head-eagle', 'indian-head-eagle',
  'liberty-head-double-eagle', 'saint-gaudens-double-eagle',
  'american-gold-eagle', 'american-gold-buffalo',
  'first-spouses', 'ultra-high-relief-double-eagle', 'american-liberty-gold', 'liberty-and-britannia',
  'classic-gold-commemoratives', 'modern-gold-commemoratives',
  'templeton-reid', 'bechtler', 'california-gold', 'california-fractional-gold',
  'oregon-gold', 'mormon-gold', 'colorado-gold',
])

const SILVER_SERIES = new Set([
  'bust-half-disme', 'flowing-hair-half-dime', 'draped-bust-half-dime', 'capped-bust-half-dime', 'liberty-seated-half-dime',
  'draped-bust-dime', 'capped-bust-dime', 'liberty-seated-dime', 'barber-dime', 'mercury-dime', 'roosevelt-dime',
  'twenty-cent-piece',
  'draped-bust-quarter', 'capped-bust-quarter', 'liberty-seated-quarter',
  'barber-quarter', 'standing-liberty-quarter', 'washington-quarter',
  'flowing-hair-half-dollar', 'draped-bust-half-dollar',
  'capped-bust-half-dollar', 'liberty-seated-half-dollar',
  'barber-half-dollar', 'walking-liberty-half-dollar', 'franklin-half-dollar',
  'kennedy-half-dollar',
  'flowing-hair-dollar', 'draped-bust-dollar',
  'liberty-seated-dollar', 'trade-dollar',
  'morgan-dollar', 'peace-dollar', 'morgan-dollar-2021', 'peace-dollar-2021',
  'american-silver-eagle',
  'classic-silver-commemoratives', 'modern-silver-clad-commemoratives', 'silver-proof-sets',
  'atb-silver-quarters', 'massachusetts-silver-coins', 'pre-1776-states-coinage',
  'three-cent-silver',
])

const COPPER_SERIES = new Set([
  'liberty-cap-half-cent', 'draped-bust-half-cent', 'classic-head-half-cent', 'braided-hair-half-cent',
  'flowing-hair-cent', 'liberty-cap-cent', 'draped-bust-cent',
  'classic-head-cent', 'coronet-matron-head-cent', 'braided-hair-cent',
  'flying-eagle-cent', 'indian-head-cent', 'lincoln-wheat-cent',
  'two-cent-piece',
])

const NICKEL_SERIES = new Set([
  'three-cent-nickel',
  'shield-nickel', 'liberty-head-nickel', 'buffalo-nickel',
  'jefferson-nickel', 'westward-journey-nickel', 'jefferson-nickel-return',
])

const CLAD_SERIES = new Set([
  'lincoln-memorial-cent', 'lincoln-bicentennial-cent', 'lincoln-shield-cent',
  '50-state-quarters', 'dc-us-territories-quarters',
  'america-the-beautiful-quarters', 'american-women-quarters',
  'eisenhower-dollar', 'susan-b-anthony-dollar', 'sacagawea-dollar',
  'presidential-dollar', 'american-innovation-dollar',
  'modern-silver-clad-commemoratives',
])

const PLATINUM_SERIES = new Set(['american-platinum-eagle'])
const PALLADIUM_SERIES = new Set(['american-palladium-eagle'])

function seriesMatchesComposition(slug: string, composition: string): boolean {
  if (composition === 'all') return true
  if (composition === 'gold') return GOLD_SERIES.has(slug)
  if (composition === 'silver') return SILVER_SERIES.has(slug)
  if (composition === 'copper') return COPPER_SERIES.has(slug)
  if (composition === 'nickel') return NICKEL_SERIES.has(slug)
  if (composition === 'clad') return CLAD_SERIES.has(slug)
  if (composition === 'platinum') return PLATINUM_SERIES.has(slug)
  if (composition === 'palladium') return PALLADIUM_SERIES.has(slug)
  return true
}

// ─── Date range helpers ──────────────────────────────────────────────────────
function parseSeriesYearRange(dateRange: string): [number, number] {
  const clean = dateRange.replace('–', '-').replace('c. ', '').trim()
  const parts = clean.split('-')
  const start = parseInt(parts[0]) || 0
  const rawEnd = parts[1]?.trim()
  const end = !rawEnd || rawEnd === 'present' ? new Date().getFullYear() : parseInt(rawEnd) || start
  return [start, end]
}

function seriesOverlapsYears(series: CoinSeries, fromYear: number | null, toYear: number | null): boolean {
  if (!fromYear && !toYear) return true
  const [start, end] = parseSeriesYearRange(series.dateRange)
  if (fromYear && end < fromYear) return false
  if (toYear && start > toYear) return false
  return true
}

// ─── Category helpers ────────────────────────────────────────────────────────
const GOLD_CAT_SLUGS = ['gold-dollars', 'quarter-eagles', 'three-dollar-gold', 'half-eagles', 'eagles', 'double-eagles']

function getDisplayedCategories(category: string) {
  if (category === 'all') return COIN_CATALOG
  if (category === 'gold') return COIN_CATALOG.filter(c => GOLD_CAT_SLUGS.includes(c.slug))
  return COIN_CATALOG.filter(c => c.slug === category)
}

function categoryYearSpan(cat: typeof COIN_CATALOG[number]): string {
  const years = cat.series.flatMap(s => {
    const clean = s.dateRange.replace('–', '-').replace('c. ', '').trim()
    const parts = clean.split('-')
    const start = parseInt(parts[0]) || 0
    const rawEnd = parts[1]?.trim()
    const end = !rawEnd || rawEnd === 'present' ? new Date().getFullYear() : parseInt(rawEnd) || start
    return [start, end]
  }).filter(Boolean)
  if (!years.length) return ''
  const min = Math.min(...years)
  const max = Math.max(...years)
  return `${min}–${max >= new Date().getFullYear() ? 'present' : max}`
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    composition?: string
    fromYear?: string
    toYear?: string
    q?: string
  }>
}) {
  const { category = 'all', composition = 'all', fromYear, toYear, q = '' } = await searchParams
  const supabase = await createClient()

  const { data: rawListings } = await supabase
    .from('listings')
    .select('coin_name, price, listing_type')
    .eq('status', 'active')

  const fixedCountMap = new Map<string, number>()
  const auctionCountMap = new Map<string, number>()
  const minPriceMap = new Map<string, number>()
  for (const row of rawListings ?? []) {
    if (!row.coin_name) continue
    const key = row.coin_name.toLowerCase().trim()
    if (row.listing_type === 'auction') {
      auctionCountMap.set(key, (auctionCountMap.get(key) ?? 0) + 1)
    } else {
      fixedCountMap.set(key, (fixedCountMap.get(key) ?? 0) + 1)
    }
    if (row.price != null) {
      const prev = minPriceMap.get(key)
      if (prev === undefined || row.price < prev) minPriceMap.set(key, row.price)
    }
  }

  function seriesStats(series: CoinSeries): { count: number; fixedCount: number; auctionCount: number; minPrice: number | null } {
    let fixedCount = 0
    let auctionCount = 0
    let minPrice: number | null = null
    for (const name of series.coinNames) {
      const key = name.toLowerCase().trim()
      fixedCount += fixedCountMap.get(key) ?? 0
      auctionCount += auctionCountMap.get(key) ?? 0
      const p = minPriceMap.get(key)
      if (p !== undefined && (minPrice === null || p < minPrice)) minPrice = p
    }
    return { count: fixedCount + auctionCount, fixedCount, auctionCount, minPrice }
  }

  function categoryListingCounts(cat: typeof COIN_CATALOG[number]): { total: number; fixed: number; auction: number } {
    return cat.series.reduce((acc, s) => {
      const { fixedCount, auctionCount } = seriesStats(s)
      return { total: acc.total + fixedCount + auctionCount, fixed: acc.fixed + fixedCount, auction: acc.auction + auctionCount }
    }, { total: 0, fixed: 0, auction: 0 })
  }

  const totalListings = rawListings?.length ?? 0
  const isDirectory = category === 'all'

  const fromYearNum = fromYear ? parseInt(fromYear) : null
  const toYearNum = toYear ? parseInt(toYear) : null

  const displayedCategories = getDisplayedCategories(category)
  const searchQuery = q.toLowerCase().trim()
  const filteredCategories = displayedCategories
    .map(cat => ({
      ...cat,
      series: cat.series.filter(
        s =>
          seriesMatchesComposition(s.slug, composition) &&
          seriesOverlapsYears(s, fromYearNum, toYearNum) &&
          (!searchQuery || s.name.toLowerCase().includes(searchQuery) || s.coinNames.some(n => n.toLowerCase().includes(searchQuery)))
      ),
    }))
    .filter(cat => cat.series.length > 0)

  // For drill-down heading
  const drillTitle = filteredCategories.length === 1
    ? filteredCategories[0].name
    : displayedCategories[0]?.name ?? 'Listings'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          {isDirectory ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Explore all listings</h1>
              <p className="text-muted-foreground mt-1.5">
                {totalListings > 0
                  ? `Browse ${totalListings.toLocaleString()} active listing${totalListings !== 1 ? 's' : ''}: buy now or bid at auction`
                  : 'Every major US coin series. Select a category to browse.'}
              </p>
            </>
          ) : (
            <>
              <Link
                href="/listings"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                All categories
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">{drillTitle}</h1>
              <p className="text-muted-foreground mt-1.5">
                {filteredCategories.reduce((sum, c) => sum + c.series.length, 0)} series
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/buy-now"
            className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-base font-bold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="h-4 w-4" />
            Buy Now
          </Link>
          <Link
            href="/auctions"
            className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-base font-bold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
          >
            <Gavel className="h-4 w-4" />
            Live Auctions
          </Link>
        </div>
      </div>

      <ExploreFilters />

      <main>
        {isDirectory ? (
          /* ── Directory view ── */
          <>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
              <p className="text-lg font-medium mb-2">No series match your filters</p>
              <p className="text-sm">Try adjusting the metal or date range.</p>
            </div>
          ) : (
            <DirectoryClient
              categories={filteredCategories.map(cat => {
                const counts = categoryListingCounts(cat)
                return {
                  slug: cat.slug,
                  name: cat.name,
                  thumb: cat.series.find(s => s.image)?.image ?? null,
                  totalListings: counts.total,
                  fixedListings: counts.fixed,
                  auctionListings: counts.auction,
                  series: cat.series.map(s => {
                    const { count, fixedCount, auctionCount, minPrice } = seriesStats(s)
                    return {
                      slug: s.slug,
                      name: s.name,
                      dateRange: s.dateRange,
                      denomination: s.denomination,
                      image: s.image ?? undefined,
                      imageReverse: s.imageReverse ?? undefined,
                      dualSide: s.dualSide,
                      count,
                      fixedCount,
                      auctionCount,
                      minPrice,
                    }
                  }),
                }
              })}
            />
          )}
          </>
        ) : (
          /* ── Drill-down grid view ── */
          <>
            {filteredCategories.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
                <p className="text-lg font-medium mb-2">No series match your filters</p>
                <p className="text-sm">Try adjusting the metal or date range.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {filteredCategories.map(cat => (
                  <section key={cat.slug}>
                    {/* Section label — only shown when multiple sub-categories */}
                    {filteredCategories.length > 1 && (
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-foreground/70 whitespace-nowrap">
                          {cat.name}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {cat.series.map(series => {
                        const { count, minPrice } = seriesStats(series)
                        const hasListings = count > 0
                        const showImage = series.image && !series.dualSide
                        return (
                          <Link
                            key={series.slug}
                            href={`/listings/series/${series.slug}`}
                            className="group block min-w-0 rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm hover:border-foreground/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out"
                          >
                            {/* Image area */}
                            {showImage ? (
                              <CoinCardImage
                                image={series.image!}
                                imageReverse={series.imageReverse ?? undefined}
                                name={series.name}
                              />
                            ) : (
                              <div
                                className="aspect-square"
                                style={{ background: placeholderGradient(series.slug) }}
                              />
                            )}

                            {/* Card info */}
                            <div className="px-3.5 pt-3 pb-3.5 space-y-1">
                              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60">
                                {series.dateRange}
                                {series.denomination && (
                                  <span className="font-mono normal-case tracking-normal"> · {series.denomination}</span>
                                )}
                              </p>
                              <p className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground">
                                {series.name}
                              </p>
                              <div className="pt-1.5">
                                {hasListings ? (
                                  <div>
                                    <p className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      {count} available
                                    </p>
                                    {minPrice !== null && (
                                      <p className="text-[12px] font-medium text-foreground/60 tabular-nums">
                                        from {(minPrice / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[13px] font-medium text-muted-foreground/70">No listings</p>
                                )}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t see your coin?{' '}
            <Link href="/listings/new" className="underline underline-offset-4 hover:text-foreground">
              List it now
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

