'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Clock, Search, Flame, Heart, Gavel } from 'lucide-react'
import { formatCents } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

async function fetchAuctionsData() {
  const supabase = createClient()
  const [{ data: raw }, { data: wishlistRaw }] = await Promise.all([
    supabase
      .from('auctions')
      .select('*, listing:listings(id, title, coin_name, grading_service, grade, year, mint_mark, denomination, verification_status, images, series_slug)')
      .gt('end_time', new Date().toISOString())
      .limit(96),
    supabase
      .from('collection_items')
      .select('series_slug, user_id')
      .eq('type', 'wishlist')
      .not('series_slug', 'is', null),
  ])

  const wishlistMap: Record<string, number> = {}
  if (wishlistRaw) {
    const seen = new Map<string, Set<string>>()
    for (const row of wishlistRaw) {
      if (!row.series_slug) continue
      if (!seen.has(row.series_slug)) seen.set(row.series_slug, new Set())
      seen.get(row.series_slug)!.add(row.user_id)
    }
    for (const [slug, users] of seen) wishlistMap[slug] = users.size
  }

  return {
    auctions: ((raw ?? []).filter(a => a.listing)) as AuctionRow[],
    wishlistMap,
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface AuctionRow {
  id: string
  listing_id: string
  start_price: number
  current_bid: number | null
  reserve_price: number | null
  start_time: string
  end_time: string
  bid_count: number
  listing: {
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
    series_slug: string | null
  }
}

type Tab = 'ending-soon' | 'most-active' | 'just-listed'

// ── Time left ────────────────────────────────────────────────────────────────
function timeLeft(endTime: string): { label: string; urgent: boolean } {
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return { label: 'Ended', urgent: true }
  const h = Math.floor(diff / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  if (h < 1) return { label: `${m}m left`, urgent: true }
  if (h < 24) return { label: `${h}h ${m}m left`, urgent: true }
  const d = Math.floor(h / 24)
  return { label: `${d}d left`, urgent: false }
}

// ── Card ─────────────────────────────────────────────────────────────────────
function AuctionCard({ auction, hot = false, wishlistCounts }: { auction: AuctionRow; hot?: boolean; wishlistCounts: Record<string, number> }) {
  const { listing } = auction
  const currentPrice = auction.current_bid ?? auction.start_price
  const { label, urgent } = timeLeft(auction.end_time)
  const isVerified = listing.verification_status === 'verified'
  const hasBids = auction.bid_count > 0
  const wishCount = wishlistCounts[auction.listing.series_slug ?? ''] ?? 0

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

        {/* Time badge */}
        <div className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${
          urgent ? 'bg-red-500/90 text-white' : 'bg-black/60 text-white'
        }`}>
          <Clock className="h-3 w-3" />
          {label}
        </div>

        {/* Wishlist badge */}
        {wishCount >= 3 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-rose-500/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Heart className="h-2.5 w-2.5" fill="currentColor" />
            {wishCount} want this
          </div>
        )}

        {/* Hot badge */}
        {hot && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-orange-500/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Flame className="h-2.5 w-2.5" />
            Hot
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60 mb-1">
          {listing.grading_service} · {listing.grade}
          {listing.year && <span className="font-mono normal-case tracking-normal"> · {listing.year}{listing.mint_mark ? `-${listing.mint_mark}` : ''}</span>}
        </p>
        <p className="text-[15px] font-semibold leading-snug line-clamp-2 text-foreground mb-2">
          {listing.title}
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] text-muted-foreground/70">
              {hasBids ? `${auction.bid_count} bid${auction.bid_count !== 1 ? 's' : ''}` : 'No bids yet'}
            </p>
            <p className="text-[17px] font-bold text-foreground tabular-nums">
              {formatCents(currentPrice)}
            </p>
          </div>
          {auction.reserve_price && currentPrice < auction.reserve_price && (
            <p className="text-[14px] text-amber-600 font-medium">Reserve not met</p>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
export function AuctionsClient() {
  const [tab, setTab] = useState<Tab>('ending-soon')
  const [query, setQuery] = useState('')

  const { data, isLoading } = useSWR('auctions-live', fetchAuctionsData, {
    keepPreviousData: true,
    refreshInterval: 30_000, // refresh every 30s so bids stay live
  })

  const auctions = data?.auctions ?? []
  const wishlistCounts = data?.wishlistMap ?? {}

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ending-soon', label: 'Ending Soon' },
    { id: 'most-active', label: 'Most Active' },
    { id: 'just-listed', label: 'Just Listed' },
  ]

  const filtered = useMemo(() => {
    let list = [...auctions]

    // Search
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(a =>
        a.listing.title.toLowerCase().includes(q) ||
        a.listing.coin_name?.toLowerCase().includes(q) ||
        String(a.listing.year ?? '').includes(q) ||
        a.listing.grade.toLowerCase().includes(q) ||
        a.listing.grading_service.toLowerCase().includes(q)
      )
    }

    // Filter + sort by tab
    if (tab === 'ending-soon') {
      list.sort((a, b) => new Date(a.end_time).getTime() - new Date(b.end_time).getTime())
    } else if (tab === 'most-active') {
      list = list.filter(a => a.bid_count >= 8)
      list.sort((a, b) => b.bid_count - a.bid_count)
    } else if (tab === 'just-listed') {
      list.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
    }

    return list
  }, [auctions, tab, query])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Live Auctions</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading auctions…' : auctions.length > 0
              ? `${auctions.length} active auction${auctions.length !== 1 ? 's' : ''}. Bid before time runs out.`
              : 'No live auctions right now. Check back soon.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
            <Link href="/buy-now" className="px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Buy Now
            </Link>
            <span className="px-4 py-2 bg-foreground text-background">Auctions</span>
          </div>
          <Link
            href="/listings"
            className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
          >
            Browse All
          </Link>
        </div>
      </div>

      {/* Search + filters */}
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
          {filtered.length} auction{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {filtered.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              hot={auction.bid_count >= 8}
              wishlistCounts={wishlistCounts}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
          <p className="text-lg font-medium mb-2">No auctions found</p>
          <p className="text-sm">Try a different search or check back soon.</p>
        </div>
      )}
    </div>
  )
}
