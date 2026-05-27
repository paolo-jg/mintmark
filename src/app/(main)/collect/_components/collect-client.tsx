'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Plus, Trash2, Star, Coins, ScanLine, ArrowRight, ArrowUpRight, Search, X, Pencil, LogIn, Tag, ChevronDown, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { COIN_CATALOG } from '@/lib/coins/catalog'
import { CoinSelector } from './coin-selector'
import { CoinScanModal } from './coin-scan-modal'
import { CoinDetailModal } from './coin-detail-modal'
import { WishlistEditModal } from './wishlist-edit-modal'

// Strip a trailing year (and optional mint mark) from a coin name so we can do
// broader searches: "Morgan Dollar 1893-S" → "Morgan Dollar"
function stripYearFromCoinName(coinName: string): string {
  return coinName.replace(/\s+\d{4}(-[A-Z]+)?\s*$/, '').trim()
}

// Try to find a catalog series slug that matches the coin name.
// Falls back to null if no match, so callers can use a plain text search instead.
function resolveSeriesSlug(coinName: string): string | null {
  const base = stripYearFromCoinName(coinName).toLowerCase()
  for (const cat of COIN_CATALOG) {
    for (const series of cat.series) {
      for (const cn of series.coinNames) {
        const cnLower = cn.toLowerCase()
        if (base === cnLower || base.startsWith(cnLower) || cnLower.startsWith(base)) {
          return series.slug
        }
      }
    }
  }
  return null
}

// Build the "Find on Market" URL for a wishlist item.
// Prefers the series page (shows all dates) over a keyword search.
function getMarketUrl(item: { series_slug: string | null; coin_name: string }): string {
  const slug = item.series_slug ?? resolveSeriesSlug(item.coin_name)
  if (slug) return `/listings/series/${slug}`
  const searchTerm = stripYearFromCoinName(item.coin_name)
  return `/listings?q=${encodeURIComponent(searchTerm)}`
}

function SignupPromptModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl p-8 text-center">
        <div className="flex items-center justify-center mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Coins className="h-7 w-7 text-muted-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2">Save your collection</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Create a free account to save coins, track your wish list, and get notified when matches are listed.
        </p>
        <div className="flex flex-col gap-2">
          <Button className="w-full" render={<Link href="/auth/register" />}>
            Create free account
          </Button>
          <Button variant="outline" className="w-full" render={<Link href="/auth/login" />}>
            <LogIn className="h-4 w-4 mr-1.5" />
            Sign in
          </Button>
          <button
            onClick={onClose}
            className="mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

export type OwnedStatus = 'owned' | 'for_sale' | 'sold'
type StatusFilter = 'all' | OwnedStatus
type WishlistFilter = 'all' | 'highlighted'

function matchesSearch(item: CollectionItem, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return [
    item.coin_name,
    item.year?.toString(),
    item.mint_mark,
    item.grade,
    item.grading_service,
    item.cert_number,
    item.denomination,
  ].some(v => v?.toLowerCase().includes(q))
}

function slugToTitle(slug: string | null): string {
  if (!slug) return 'Other'
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function groupBySeries(items: CollectionItem[]): Map<string, CollectionItem[]> {
  const map = new Map<string, CollectionItem[]>()
  for (const item of items) {
    const key = slugToTitle(item.series_slug ?? null)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

export interface CollectionItem {
  id: string
  type: 'owned' | 'wishlist'
  status: OwnedStatus
  starred: boolean
  coin_name: string
  year: number | null
  mint_mark: string | null
  denomination: string | null
  cert_number: string | null
  grading_service: string | null
  grade: string | null
  pcgs_image_url: string | null
  max_price: number | null
  notes: string | null
  coin_profile: unknown | null
  series_slug: string | null
  created_at: string
  // canonical coin type from the linked listing (if auto-created from a listing)
  listing_coin_name?: string | null
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_DISPLAY: Record<OwnedStatus, { label: string; color: string; dot: string }> = {
  owned:    { label: 'In Collection', color: 'text-foreground',       dot: 'bg-foreground/30' },
  for_sale: { label: 'For Sale',      color: 'text-amber-600',        dot: 'bg-amber-400'     },
  sold:     { label: 'Sold',          color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
}

// Per-status leading indicator — icon for owned, coloured dot for the rest
function StatusIcon({ status }: { status: OwnedStatus }) {
  if (status === 'owned') return <Coins className="h-3.5 w-3.5 text-foreground/50 flex-shrink-0" />
  const { dot } = STATUS_DISPLAY[status]
  return <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
}

// Dropdown for manually changing a coin's status.
// Status is mostly system-controlled; the only manual actions are:
//   • Move to Wish List  (for owned / for_sale)
//   • Mark as sold       (for external sales, owned / for_sale)
function StatusDropdown({ item, onMarkAsSold, onMoveToWishlist }: {
  item: CollectionItem
  onMarkAsSold: () => void
  onMoveToWishlist: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { label, color } = STATUS_DISPLAY[item.status] ?? STATUS_DISPLAY.owned
  const canChange = item.status !== 'sold'

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  if (!canChange) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <StatusIcon status={item.status} />
        <span className={`text-[12px] font-medium ${color}`}>{label}</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
          open ? 'border-foreground/40 bg-muted' : 'border-border hover:bg-muted'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <StatusIcon status={item.status} />
          <span className={`text-[12px] font-medium ${color}`}>{label}</span>
        </div>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-20 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setOpen(false); onMoveToWishlist() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] hover:bg-muted transition-colors text-left"
          >
            <Star className="h-3.5 w-3.5 text-muted-foreground" />
            Move to Wish List
          </button>
          <div className="h-px bg-border mx-3" />
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setOpen(false); onMarkAsSold() }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark as sold
          </button>
        </div>
      )}
    </div>
  )
}

function StarButton({ starred, onToggle }: { starred: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onToggle() }}
      title={starred ? 'Remove from highlights' : 'Add to highlights'}
      className={`absolute top-2 left-2 rounded-full p-1.5 border transition-all ${
        starred
          ? 'bg-amber-400 border-amber-400 text-white opacity-100'
          : 'bg-background/90 backdrop-blur-sm border-border text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-500'
      }`}
    >
      <Star className="h-3.5 w-3.5" fill={starred ? 'currentColor' : 'none'} />
    </button>
  )
}

function OwnedCard({ item, onDelete, onUpdate, onClick }: {
  item: CollectionItem
  onDelete: () => void
  onUpdate: (updated: CollectionItem) => void
  onClick: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      onDelete()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove')
      setDeleting(false)
    }
  }

  const handleMarkAsSold = async () => {
    onUpdate({ ...item, status: 'sold' })
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: 'sold' }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      // If the coin was for_sale the PATCH endpoint also expires the linked listing
    } catch (e) {
      onUpdate(item)
      toast.error(e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  const handleMoveToWishlist = async () => {
    onUpdate({ ...item, type: 'wishlist', status: 'owned' })
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Pass status: 'owned' so the API expires any linked for_sale listing
        body: JSON.stringify({ id: item.id, type: 'wishlist', status: 'owned' }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('Moved to wish list')
    } catch (e) {
      onUpdate(item)
      toast.error(e instanceof Error ? e.message : 'Failed to move')
    }
  }

  const handleStarToggle = async () => {
    const starred = !item.starred
    onUpdate({ ...item, starred })
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, starred }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
    } catch (e) {
      onUpdate(item)
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  const isSold = item.status === 'sold'

  const displayName = item.listing_coin_name ?? item.coin_name

  return (
    <div
      className={`group relative rounded-2xl border border-border bg-background overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col ${isSold ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative shrink-0">
        {item.pcgs_image_url ? (
          <Image src={item.pcgs_image_url} alt={displayName} fill sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" className="object-contain mix-blend-multiply" />
        ) : (
          <Coins className="h-12 w-12 text-muted-foreground/20" />
        )}
      </div>

      {item.status !== 'sold' && <StarButton starred={item.starred} onToggle={handleStarToggle} />}

      <button
        onClick={e => { e.stopPropagation(); handleDelete() }}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="p-4 flex flex-col flex-1">
        {(item.grading_service || item.grade) && (
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-1">
            {[item.grading_service, item.grade].filter(Boolean).join(' · ')}
            {item.year && <span className="font-mono normal-case tracking-normal"> · {item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}</span>}
          </p>
        )}
        <p className={`text-[14px] font-semibold leading-snug text-foreground ${isSold ? 'line-through text-muted-foreground' : ''}`}>
          {displayName}
        </p>
        {item.cert_number && (
          <p className="text-[11px] text-muted-foreground mt-1">Cert #{item.cert_number}</p>
        )}
        {item.notes && (
          <p className="text-[12px] text-muted-foreground/70 mt-1.5 italic">{item.notes}</p>
        )}
        <div className="mt-auto pt-3 border-t border-border/50 space-y-2" onClick={e => e.stopPropagation()}>
          <StatusDropdown item={item} onMarkAsSold={handleMarkAsSold} onMoveToWishlist={handleMoveToWishlist} />
          {item.status === 'owned' && (
            <Link
              href={`/listings/new?from=${item.id}`}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold border border-border rounded-lg py-1.5 hover:bg-muted transition-colors"
            >
              <Tag className="h-3 w-3" />
              List for Sale
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function WishlistCard({ item, onDelete, onMoveToOwned, onUpdate, onEdit, onClick, listingCount }: {
  item: CollectionItem
  onDelete: () => void
  onMoveToOwned: () => void
  onUpdate: (updated: CollectionItem) => void
  onEdit: () => void
  onClick: () => void
  listingCount?: number
}) {
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      onDelete()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove')
      setDeleting(false)
    }
  }

  const handleMove = async () => {
    setMoving(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, type: 'owned', status: 'owned' }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('Moved to owned')
      onMoveToOwned()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to move')
      setMoving(false)
    }
  }

  const handleStarToggle = async () => {
    const starred = !item.starred
    onUpdate({ ...item, starred })
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, starred }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
    } catch (e) {
      onUpdate(item)
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  return (
    <div
      className="group relative rounded-2xl border border-border bg-background overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
        {item.pcgs_image_url ? (
          <Image src={item.pcgs_image_url} alt={item.coin_name} fill sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw" className="object-contain mix-blend-multiply" />
        ) : (
          <Star className="h-10 w-10 text-muted-foreground/20" />
        )}
      </div>

      <StarButton starred={item.starred} onToggle={handleStarToggle} />

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={onEdit}
          title="Edit"
          className="bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remove"
          className="bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-4">
        {item.grading_service && (
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-1">
            {item.grading_service}{item.grade ? ` · ${item.grade}` : ''}
          </p>
        )}
        <p className="text-[14px] font-semibold leading-snug text-foreground">
          {item.coin_name}
        </p>
        {item.max_price && (
          <p className="text-[12px] text-muted-foreground mt-1">Max: {formatPrice(item.max_price)}</p>
        )}
        {item.notes && (
          <p className="text-[12px] text-muted-foreground/70 mt-1.5 italic">{item.notes}</p>
        )}
        <div className="mt-3 pt-2.5 border-t border-border/50 space-y-2" onClick={e => e.stopPropagation()}>
          <Link
            href={getMarketUrl(item)}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium border border-border rounded-lg py-1.5 hover:bg-muted transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Find on Market
            {listingCount !== undefined && listingCount > 0 && (
              <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 text-[10px] font-semibold">
                {listingCount}
              </span>
            )}
          </Link>
          <button
            onClick={handleMove}
            disabled={moving}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-foreground text-background rounded-lg py-1.5 hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Move to Owned
          </button>
        </div>
      </div>
    </div>
  )
}

function CoinGrid({ items, renderCard }: { items: CollectionItem[]; renderCard: (item: CollectionItem) => React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map(item => renderCard(item))}
    </div>
  )
}

type Tab = 'owned' | 'wishlist' | 'sold'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'owned',    label: 'In Collection' },
  { value: 'for_sale', label: 'For Sale' },
]

const WISHLIST_FILTERS: { value: WishlistFilter; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'highlighted', label: 'Highlighted' },
]

function SectionHeader({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
    </div>
  )
}

export async function fetchCollectionItems(): Promise<{ items: CollectionItem[]; isLoggedIn: boolean }> {
  const db = createClient()
  const { data: { session } } = await db.auth.getSession()
  const user = session?.user
  if (!user) return { items: [], isLoggedIn: false }
  const { data } = await db
    .from('collection_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const rawItems = (data ?? []) as CollectionItem[]

  // For items auto-created from listings, backfill the canonical coin_name
  // (the listing's coin_name field, not the seller's custom title)
  if (rawItems.length > 0) {
    const { data: linkedListings } = await db
      .from('listings')
      .select('collection_item_id, coin_name')
      .in('collection_item_id', rawItems.map(i => i.id))
    const coinNameByItemId = new Map(
      (linkedListings ?? [])
        .filter(l => l.coin_name)
        .map(l => [l.collection_item_id as string, l.coin_name as string])
    )
    return {
      items: rawItems.map(item => ({
        ...item,
        listing_coin_name: coinNameByItemId.get(item.id) ?? null,
      })),
      isLoggedIn: true,
    }
  }

  return { items: rawItems, isLoggedIn: true }
}

export function CollectClient() {
  const { data, mutate } = useSWR('collect-items', fetchCollectionItems, {
    keepPreviousData: true,
  })
  const isLoggedIn = data?.isLoggedIn ?? false

  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'owned'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [showOwned, setShowOwned] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [showWishlist, setShowWishlist] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null)
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [wishlistFilter, setWishlistFilter] = useState<WishlistFilter>('all')
  const [ownedSearch, setOwnedSearch] = useState('')
  const [wishlistSearch, setWishlistSearch] = useState('')
  const [soldSearch, setSoldSearch] = useState('')
  const [wishlistCounts, setWishlistCounts] = useState<Record<string, number>>({})

  // Sync SWR data into local items state
  useEffect(() => {
    if (data?.items) setItems(data.items)
  }, [data?.items])

  const openAddOwned = () => isLoggedIn ? setShowOwned(true) : setShowSignupPrompt(true)
  const openAddScan  = () => isLoggedIn ? setShowScan(true)  : setShowSignupPrompt(true)
  const openAddWish  = () => isLoggedIn ? setShowWishlist(true) : setShowSignupPrompt(true)

  const allOwned = items.filter(i => i.type === 'owned')
  const owned = allOwned.filter(i => i.status !== 'sold')
  const soldCoins = allOwned.filter(i => i.status === 'sold')
  const wishlist = items.filter(i => i.type === 'wishlist')

  // Owned: filter by status + search, then split highlighted vs grouped-by-series
  const filteredOwned = owned
    .filter(i => statusFilter === 'all' || i.status === statusFilter)
    .filter(i => matchesSearch(i, ownedSearch))
  const highlightedOwned = filteredOwned.filter(i => i.starred)
  const seriesOwned = groupBySeries(filteredOwned.filter(i => !i.starred))

  // Sold: search only, newest first
  const filteredSold = soldCoins.filter(i => matchesSearch(i, soldSearch))

  // Wishlist: filter + search, sorted newest-first (API already returns desc)
  const filteredWishlist = wishlist
    .filter(i => wishlistFilter === 'all' || i.starred)
    .filter(i => matchesSearch(i, wishlistSearch))

  const refresh = async () => {
    await mutate()
  }

  // Fetch active listing counts for all wishlisted series so the cards can show badges.
  // Items without a stored series_slug are resolved via the catalog so they still get counts.
  useEffect(() => {
    const slugs = [...new Set(
      wishlist
        .map(i => i.series_slug ?? resolveSeriesSlug(i.coin_name))
        .filter((s): s is string => Boolean(s))
    )]
    if (slugs.length === 0) return
    const db = createClient()
    Promise.all(
      slugs.map(slug =>
        db
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('series_slug', slug)
          .then(({ count }) => ({ slug, count: count ?? 0 }))
      )
    ).then(results => {
      const counts: Record<string, number> = {}
      for (const { slug, count } of results) counts[slug] = count
      setWishlistCounts(counts)
    })
  }, [wishlist.length]) // re-run when wishlist items change

  const handleDelete = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const handleUpdate = (updated: CollectionItem) => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'owned',    label: 'Owned',     count: owned.length },
    { id: 'wishlist', label: 'Wish List', count: wishlist.length },
    ...(isLoggedIn ? [{ id: 'sold' as Tab, label: 'Sold', count: soldCoins.length }] : []),
  ]

  const ownedCard = (item: CollectionItem) => (
    <OwnedCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} onUpdate={handleUpdate} onClick={() => setSelectedItem(item)} />
  )

  const wishlistCard = (item: CollectionItem) => (
    <WishlistCard
      key={item.id}
      item={item}
      onDelete={() => handleDelete(item.id)}
      onMoveToOwned={() => refresh()}
      onUpdate={handleUpdate}
      onEdit={() => setEditingItem(item)}
      onClick={() => setSelectedItem(item)}
      listingCount={wishlistCounts[item.series_slug ?? resolveSeriesSlug(item.coin_name) ?? '']}
    />
  )

  // Show skeleton while SWR is loading — prevents blank-screen flash
  if (!data) {
    return (
      <div>
        {/* Static tabs shell */}
        <div className="flex items-center justify-between mb-6 border-b border-border">
          <div className="flex gap-1">
            {['Owned', 'Wish List', 'Sold'].map(label => (
              <div key={label} className="px-4 py-2.5 text-sm font-medium text-muted-foreground">{label}</div>
            ))}
          </div>
        </div>
        {/* Skeleton grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted/60" />
              <div className="p-4 space-y-2">
                <div className="h-2.5 bg-muted rounded w-2/3" />
                <div className="h-3.5 bg-muted rounded w-full" />
                <div className="h-3.5 bg-muted rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs + Add button */}
      <div className="flex items-center justify-between mb-6 border-b border-border">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1.5 text-[11px] text-muted-foreground/60 font-normal">{t.count}</span>}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />}
            </button>
          ))}
        </div>
        <div className="pb-2 flex items-center gap-2">
          {tab === 'owned' && (
            <>
              <Button variant="outline" size="lg" className="h-11 px-4" render={<Link href="/dashboard/portfolio" />}>
                Calculate Portfolio Value
              </Button>
              <Button variant="outline" size="lg" className="h-11 px-4" onClick={openAddScan}>
                <ScanLine className="h-4 w-4 mr-1.5" />Scan
              </Button>
              <Button size="lg" className="h-11 px-4" onClick={openAddOwned}>
                <Plus className="h-4 w-4 mr-1" />Add Owned
              </Button>
            </>
          )}
          {tab === 'wishlist' && (
            <>
              <Button variant="outline" size="lg" className="h-11 px-4" render={<Link href="/dashboard/portfolio" />}>
                Estimate Wishlist Cost
              </Button>
              <Button size="lg" className="h-11 px-4" onClick={openAddWish}>
                <Plus className="h-4 w-4 mr-1" />Add to Wish List
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── OWNED TAB ── */}
      {tab === 'owned' && (
        owned.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl">
            <Coins className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-base font-medium mb-1.5">No coins in your collection yet</p>
            <p className="text-sm mb-5">Browse the catalog manually or scan a photo to identify your coin with AI.</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="lg" className="h-11 px-4" onClick={openAddScan}>
                <ScanLine className="h-4 w-4 mr-1.5" />Scan with AI
              </Button>
              <Button variant="outline" size="lg" className="h-11 px-4" onClick={openAddOwned}>
                <Plus className="h-4 w-4 mr-1" />Add manually
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                value={ownedSearch}
                onChange={e => setOwnedSearch(e.target.value)}
                placeholder="Search by name, year, grade, cert..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
              />
              {ownedSearch && (
                <button onClick={() => setOwnedSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Status filters */}
            <div className="flex gap-1.5 mb-6 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
                    statusFilter === f.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.value !== 'all' && (
                    <span className={`ml-1 ${statusFilter === f.value ? 'opacity-80' : 'opacity-50'}`}>{owned.filter(i => i.status === f.value).length}</span>
                  )}
                  {f.value === 'all' && owned.length > 0 && (
                    <span className={`ml-1 ${statusFilter === f.value ? 'opacity-80' : 'opacity-50'}`}>{owned.length}</span>
                  )}
                </button>
              ))}
            </div>

            {filteredOwned.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
                <Coins className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No coins match this filter</p>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Highlights (starred, any series) */}
                {highlightedOwned.length > 0 && (
                  <div>
                    <SectionHeader icon={<Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />} label="Highlights" />
                    <CoinGrid items={highlightedOwned} renderCard={ownedCard} />
                  </div>
                )}

                {/* Series groups */}
                {[...seriesOwned.entries()].map(([series, seriesItems]) => (
                  <div key={series}>
                    <SectionHeader label={series} />
                    <CoinGrid items={seriesItems} renderCard={ownedCard} />
                  </div>
                ))}
              </div>
            )}
          </>
        )
      )}

      {/* ── WISHLIST TAB ── */}
      {tab === 'wishlist' && (
        wishlist.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl">
            <Star className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-base font-medium mb-1.5">Your wish list is empty</p>
            <p className="text-sm mb-5">Track coins you&apos;re hunting for.</p>
            <Button variant="outline" size="lg" className="h-11 px-4" onClick={openAddWish}>
              <Plus className="h-4 w-4 mr-1" />Add your first coin
            </Button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                value={wishlistSearch}
                onChange={e => setWishlistSearch(e.target.value)}
                placeholder="Search by name, year, grade..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
              />
              {wishlistSearch && (
                <button onClick={() => setWishlistSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Wishlist filters */}
            <div className="flex gap-1.5 mb-6 flex-wrap">
              {WISHLIST_FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setWishlistFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
                    wishlistFilter === f.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.value === 'highlighted' && (
                    <span className={`ml-1 ${wishlistFilter === f.value ? 'opacity-80' : 'opacity-50'}`}>{wishlist.filter(i => i.starred).length}</span>
                  )}
                </button>
              ))}
            </div>

            {filteredWishlist.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
                <Star className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No highlighted coins yet. Star a coin to feature it here.</p>
              </div>
            ) : (
              <CoinGrid items={filteredWishlist} renderCard={wishlistCard} />
            )}
          </>
        )
      )}

      {/* ── SOLD TAB ── */}
      {tab === 'sold' && (
        soldCoins.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl">
            <Coins className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-base font-medium mb-1.5">No sold coins yet</p>
            <p className="text-sm">Mark a coin as sold from your collection to track it here.</p>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                value={soldSearch}
                onChange={e => setSoldSearch(e.target.value)}
                placeholder="Search sold coins..."
                className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
              />
              {soldSearch && (
                <button onClick={() => setSoldSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {filteredSold.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed rounded-2xl">
                <Coins className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No coins match your search</p>
              </div>
            ) : (
              <CoinGrid items={filteredSold} renderCard={item => (
                <OwnedCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} onUpdate={handleUpdate} onClick={() => setSelectedItem(item)} />
              )} />
            )}
          </>
        )
      )}

      {/* Modals */}
      {showSignupPrompt && <SignupPromptModal onClose={() => setShowSignupPrompt(false)} />}
      {selectedItem && <CoinDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
      {editingItem && <WishlistEditModal item={editingItem} onClose={() => setEditingItem(null)} onSaved={updated => { handleUpdate(updated); setEditingItem(null) }} />}
      {showScan && <CoinScanModal onClose={() => setShowScan(false)} onAdded={() => { setShowScan(false); refresh() }} />}
      {showOwned && <CoinSelector mode="owned" onClose={() => setShowOwned(false)} onAdded={() => { setShowOwned(false); refresh() }} />}
      {showWishlist && <CoinSelector mode="wishlist" onClose={() => setShowWishlist(false)} onAdded={() => { setShowWishlist(false); refresh() }} />}
    </div>
  )
}
