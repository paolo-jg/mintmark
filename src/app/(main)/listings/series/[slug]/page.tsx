export const revalidate = 60

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSeriesBySlug } from '@/lib/coins/catalog'
import { ChevronLeft } from 'lucide-react'
import { SeriesPageClient } from './series-page-client'
import { Suspense } from 'react'

function parseCatalogYears(dateRange: string): number[] {
  const normalized = dateRange.replace('–', '-').replace('—', '-')
  const single = normalized.match(/^(\d{4})$/)
  if (single) return [parseInt(single[1])]
  const range = normalized.match(/^(\d{4})-(\d{4})$/)
  if (!range) return []
  const start = parseInt(range[1])
  const end = parseInt(range[2])
  if (end - start > 300) return []
  const years: number[] = []
  for (let y = start; y <= end; y++) years.push(y) // oldest first
  return years
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { slug } = await params

  const series = getSeriesBySlug(slug)
  if (!series) notFound()

  const supabase = await createClient()

  const auctionSelect = '*, auctions(id, current_bid, start_price, end_time, bid_count, reserve_price)'

  const nameFilter = series.coinNames
    .map(n => `coin_name.ilike.${n}%`)
    .join(',')

  const [{ data: bySlug }, { data: byName }] = await Promise.all([
    supabase
      .from('listings')
      .select(auctionSelect)
      .eq('status', 'active')
      .eq('series_slug', slug),
    supabase
      .from('listings')
      .select(auctionSelect)
      .eq('status', 'active')
      .is('series_slug', null)
      .or(nameFilter),
  ])

  const now = new Date().toISOString()
  const seen = new Set<string>()
  const allListings = [...(bySlug ?? []), ...(byName ?? [])].filter(l => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    // Hide auctions whose end_time has passed
    if (l.listing_type === 'auction') {
      const auc = Array.isArray(l.auctions) ? l.auctions[0] : l.auctions as { end_time: string } | null
      if (!auc || auc.end_time <= now) return false
    }
    return true
  })

  const availableMintMarks = [...new Set(
    allListings.map(l => l.mint_mark as string | null)
  )].sort((a, b) => {
    if (!a) return -1
    if (!b) return 1
    return a.localeCompare(b)
  })

  const availableServices = [...new Set(
    allListings.map(l => l.grading_service).filter(Boolean)
  )].sort() as string[]

  const catalogYears = parseCatalogYears(series.dateRange)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Browse Coins
      </Link>

      <Suspense>
        <SeriesPageClient
          allListings={allListings}
          catalogYears={catalogYears}
          availableMintMarks={availableMintMarks}
          availableServices={availableServices}
          series={{
            name: series.name,
            dateRange: series.dateRange,
            denomination: series.denomination,
            notes: series.notes,
          }}
        />
      </Suspense>
    </div>
  )
}
