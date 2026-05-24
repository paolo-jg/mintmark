'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Star, Coins, ScanLine, ChevronDown, Check, ArrowRight, Search, X, Pencil, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { CoinSelector } from './coin-selector'
import { CoinScanModal } from './coin-scan-modal'
import { CoinDetailModal } from './coin-detail-modal'
import { WishlistEditModal } from './wishlist-edit-modal'

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
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_OPTIONS: { value: OwnedStatus; label: string; color: string; dot: string }[] = [
  { value: 'owned',    label: 'In Collection', color: 'text-foreground',       dot: 'bg-foreground/30'    },
  { value: 'for_sale', label: 'For Sale',      color: 'text-amber-600',        dot: 'bg-amber-400'        },
  { value: 'sold',     label: 'Sold',          color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
]

function StatusBadge({ item, onChange }: { item: CollectionItem; onChange: (s: OwnedStatus) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = STATUS_OPTIONS.find(o => o.value === item.status) ?? STATUS_OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-70 transition-opacity"
      >
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${current.dot}`} />
        <span className={current.color}>{current.label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1.5 z-20 bg-background border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={e => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-muted/60 transition-colors text-left"
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
              <span className={opt.color}>{opt.label}</span>
              {opt.value === item.status && <Check className="h-3 w-3 ml-auto text-muted-foreground" />}
            </button>
          ))}
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

  const handleStatusChange = async (status: OwnedStatus) => {
    onUpdate({ ...item, status })
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
    } catch (e) {
      onUpdate(item)
      toast.error(e instanceof Error ? e.message : 'Failed to update status')
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

  return (
    <div
      className={`group relative rounded-2xl border border-border bg-background overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isSold ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
        {item.pcgs_image_url ? (
          <img src={item.pcgs_image_url} alt={item.coin_name} className="w-full h-full object-contain mix-blend-multiply" />
        ) : (
          <Coins className="h-12 w-12 text-muted-foreground/20" />
        )}
      </div>

      <StarButton starred={item.starred} onToggle={handleStarToggle} />

      <button
        onClick={e => { e.stopPropagation(); handleDelete() }}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <div className="p-4">
        {(item.grading_service || item.grade) && (
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-1">
            {[item.grading_service, item.grade].filter(Boolean).join(' · ')}
            {item.year && <span className="font-mono normal-case tracking-normal"> · {item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}</span>}
          </p>
        )}
        <p className={`text-[14px] font-semibold leading-snug text-foreground ${isSold ? 'line-through text-muted-foreground' : ''}`}>
          {item.coin_name}
        </p>
        {item.cert_number && (
          <p className="text-[11px] text-muted-foreground mt-1">Cert #{item.cert_number}</p>
        )}
        {item.notes && (
          <p className="text-[12px] text-muted-foreground/70 mt-1.5 italic">{item.notes}</p>
        )}
        <div className="mt-3 pt-2.5 border-t border-border/50" onClick={e => e.stopPropagation()}>
          <StatusBadge item={item} onChange={handleStatusChange} />
        </div>
      </div>
    </div>
  )
}

function WishlistCard({ item, onDelete, onMoveToOwned, onUpdate, onEdit, onClick }: {
  item: CollectionItem
  onDelete: () => void
  onMoveToOwned: () => void
  onUpdate: (updated: CollectionItem) => void
  onEdit: () => void
  onClick: () => void
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
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
        {item.pcgs_image_url ? (
          <img src={item.pcgs_image_url} alt={item.coin_name} className="w-full h-full object-contain mix-blend-multiply" />
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
        <div className="mt-3 pt-2.5 border-t border-border/50" onClick={e => e.stopPropagation()}>
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

export function CollectClient({ initialItems, isLoggedIn }: { initialItems: CollectionItem[]; isLoggedIn: boolean }) {
  const [tab, setTab] = useState<Tab>('owned')
  const [items, setItems] = useState<CollectionItem[]>(initialItems)
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
    const res = await fetch('/api/collection')
    const json = await res.json()
    if (json.data) setItems(json.data)
  }

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
    <WishlistCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} onMoveToOwned={() => refresh()} onUpdate={handleUpdate} onEdit={() => setEditingItem(item)} onClick={() => setSelectedItem(item)} />
  )

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
              <Button size="sm" variant="outline" onClick={openAddScan}>
                <ScanLine className="h-4 w-4 mr-1.5" />Scan
              </Button>
              <Button size="sm" onClick={openAddOwned}>
                <Plus className="h-4 w-4 mr-1" />Add Owned
              </Button>
            </>
          )}
          {tab === 'wishlist' && (
            <Button size="sm" onClick={openAddWish}>
              <Plus className="h-4 w-4 mr-1" />Add to Wish List
            </Button>
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
              <Button variant="outline" size="sm" onClick={openAddScan}>
                <ScanLine className="h-4 w-4 mr-1.5" />Scan with AI
              </Button>
              <Button variant="outline" size="sm" onClick={openAddOwned}>
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
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${
                    statusFilter === f.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.value !== 'all' && (
                    <span className="ml-1 opacity-60">{owned.filter(i => i.status === f.value).length}</span>
                  )}
                  {f.value === 'all' && owned.length > 0 && (
                    <span className="ml-1 opacity-60">{owned.length}</span>
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
            <Button variant="outline" size="sm" onClick={openAddWish}>
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
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors border ${
                    wishlistFilter === f.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  }`}
                >
                  {f.label}
                  {f.value === 'highlighted' && (
                    <span className="ml-1 opacity-60">{wishlist.filter(i => i.starred).length}</span>
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
