'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Package, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatCents } from '@/lib/utils'

interface Listing {
  id: string
  title: string
  price: number | null
  listing_type: string
  grade: string | null
  grading_service: string | null
  images: string[] | null
  year: number | null
  mint_mark: string | null
}

interface Props {
  listings: Listing[]
}

type TypeFilter = 'all' | 'fixed' | 'auction'
type SortKey = 'newest' | 'price_asc' | 'price_desc'

export function StorefrontListings({ listings }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = listings

    if (typeFilter !== 'all') {
      result = result.filter(l => l.listing_type === typeFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.title.toLowerCase().includes(q) ||
        (l.grade ?? '').toLowerCase().includes(q) ||
        (l.grading_service ?? '').toLowerCase().includes(q) ||
        (l.year?.toString() ?? '').includes(q)
      )
    }

    if (sort === 'price_asc') {
      result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    } else if (sort === 'price_desc') {
      result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    }
    // 'newest' keeps server order (already sorted by created_at desc)

    return result
  }, [listings, typeFilter, sort, search])

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'fixed', label: 'Fixed Price' },
    { value: 'auction', label: 'Auction' },
  ]

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search listings…"
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type filter pills */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
            {typeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Count */}
      {(search || typeFilter !== 'all') && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || typeFilter !== 'all' ? 'No listings match your filters' : 'No active listings'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(listing => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors overflow-hidden flex flex-col group"
            >
              <div className="aspect-square bg-muted border-b border-border flex items-center justify-center overflow-hidden">
                {listing.images?.[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
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
                    : listing.listing_type === 'auction'
                    ? 'Auction'
                    : '—'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
