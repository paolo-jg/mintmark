'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ShoppingBag, Heart } from 'lucide-react'
import { formatCents } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
export interface BuyNowListing {
  id: string
  title: string
  coin_name: string | null
  grading_service: string
  grade: string
  year: number | null
  mint_mark: string | null
  denomination: string | null
  verification_status: string
  images: string[] | null
  price: number
  series_slug: string | null
  created_at: string
}

type Tab = 'newest' | 'price-asc' | 'price-desc'

// ── Card ─────────────────────────────────────────────────────────────────────
function BuyNowCard({ listing, wishlistCounts }: { listing: BuyNowListing; wishlistCounts: Record<string, number> }) {
  const wishCount = wishlistCounts[listing.series_slug ?? ''] ?? 0

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted mb-3">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
            No photo
          </div>
        )}

        {/* Wishlist badge */}
        {wishCount >= 3 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-rose-500/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Heart className="h-2.5 w-2.5" fill="currentColor" />
            {wishCount} want this
          </div>
        )}

        {/* Buy Now badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm bg-emerald-600/90 text-white">
          <ShoppingBag className="h-3 w-3" />
          Buy Now
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60 mb-1">
          {listing.grading_service} · {listing.grade}
          {listing.year && (
            <span className="font-mono normal-case tracking-normal">
              {' '}· {listing.year}{listing.mint_mark ? `-${listing.mint_mark}` : ''}
            </span>
          )}
        </p>
        <p className="text-[15px] font-semibold leading-snug line-clamp-2 text-foreground mb-2">
          {listing.title}
        </p>
        <p className="text-[19px] font-bold text-foreground tabular-nums">
          {formatCents(listing.price)}
        </p>
      </div>
    </Link>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
export function BuyNowClient({ listings, wishlistCounts }: { listings: BuyNowListing[]; wishlistCounts: Record<string, number> }) {
  const [tab, setTab] = useState<Tab>('newest')
  const [query, setQuery] = useState('')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'newest', label: 'Newest' },
    { id: 'price-asc', label: 'Price: Low to High' },
    { id: 'price-desc', label: 'Price: High to Low' },
  ]

  const filtered = useMemo(() => {
    let list = [...listings]

    // Search
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(l =>
        l.title.toLowerCase().includes(q) ||
        l.coin_name?.toLowerCase().includes(q) ||
        String(l.year ?? '').includes(q) ||
        l.grade.toLowerCase().includes(q) ||
        l.grading_service.toLowerCase().includes(q)
      )
    }

    // Sort by tab
    if (tab === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (tab === 'price-asc') {
      list.sort((a, b) => a.price - b.price)
    } else if (tab === 'price-desc') {
      list.sort((a, b) => b.price - a.price)
    }

    return list
  }, [listings, tab, query])

  return (
    <div>
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by coin, grade, year…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
        <span className="ml-auto flex items-center text-xs text-muted-foreground/60 pb-2">
          {filtered.length} listing{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {filtered.map(listing => (
            <BuyNowCard key={listing.id} listing={listing} wishlistCounts={wishlistCounts} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
          <p className="text-lg font-medium mb-2">No listings found</p>
          <p className="text-sm">Try a different search or check back soon.</p>
        </div>
      )}
    </div>
  )
}
