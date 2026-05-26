'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Search, ShoppingBag, Heart } from 'lucide-react'
import { formatCents } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

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

export async function fetchBuyNowData() {
  const supabase = createClient()
  const [{ data: listings }, { data: wishlistRaw }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, coin_name, grading_service, grade, year, mint_mark, denomination, verification_status, images, price, series_slug, created_at')
      .eq('status', 'active')
      .eq('listing_type', 'fixed')
      .order('created_at', { ascending: false })
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

  return { listings: (listings ?? []) as BuyNowListing[], wishlistMap }
}

// ── Card ─────────────────────────────────────────────────────────────────────
function BuyNowCard({ listing, wishlistCounts }: { listing: BuyNowListing; wishlistCounts: Record<string, number> }) {
  const wishCount = wishlistCounts[listing.series_slug ?? ''] ?? 0

  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted mb-3">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 text-xs">
            No photo
          </div>
        )}
        {wishCount >= 3 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-rose-500/90 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
            <Heart className="h-2.5 w-2.5" fill="currentColor" />
            {wishCount} want this
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm bg-emerald-600/90 text-white">
          <ShoppingBag className="h-3 w-3" />
          Buy Now
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold truncate mb-0.5">{listing.title}</p>
        <p className="text-xs text-muted-foreground mb-2">
          {[listing.grading_service, listing.grade].filter(Boolean).join(' · ')}
        </p>
        <p className="text-sm font-bold">{formatCents(listing.price)}</p>
      </div>
    </Link>
  )
}

// ── Main client component ─────────────────────────────────────────────────────
export function BuyNowClient() {
  const [tab, setTab] = useState<Tab>('newest')
  const [query, setQuery] = useState('')

  const { data, isLoading } = useSWR('buy-now-listings', fetchBuyNowData, {
    keepPreviousData: true,
  })

  const listings = data?.listings ?? []
  const wishlistCounts = data?.wishlistMap ?? {}

  const tabs: { id: Tab; label: string }[] = [
    { id: 'newest', label: 'Newest' },
    { id: 'price-asc', label: 'Price: Low to High' },
    { id: 'price-desc', label: 'Price: High to Low' },
  ]

  const filtered = useMemo(() => {
    let list = [...listings]
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
    if (tab === 'newest') list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (tab === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (tab === 'price-desc') list.sort((a, b) => b.price - a.price)
    return list
  }, [listings, tab, query])

  if (isLoading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="space-y-2">
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-56" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-muted rounded w-24" />
            <div className="h-9 bg-muted rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          <div className="h-9 bg-muted rounded flex-1 max-w-xs" />
          <div className="h-9 bg-muted rounded w-32" />
          <div className="h-9 bg-muted rounded w-36" />
          <div className="h-9 bg-muted rounded w-36" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <div className="aspect-square bg-muted/60" />
              <div className="p-4 space-y-2">
                <div className="h-2.5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-4/5" />
                <div className="h-5 bg-muted rounded w-1/2 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Buy Now</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading listings…' : listings.length > 0
              ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} available at fixed price`
              : 'No fixed-price listings right now. Check back soon.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm font-medium">
            <span className="px-4 py-2 bg-foreground text-background">Buy Now</span>
            <Link href="/auctions" className="px-4 py-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Auctions
            </Link>
          </div>
          <Link
            href="/listings"
            className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
          >
            Browse All
          </Link>
        </div>
      </div>

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
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
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
      ) : !isLoading ? (
        <div className="text-center py-24 text-muted-foreground border border-dashed rounded-xl">
          <p className="text-lg font-medium mb-2">No listings found</p>
          <p className="text-sm">Try a different search or check back soon.</p>
        </div>
      ) : null}
    </div>
  )
}
