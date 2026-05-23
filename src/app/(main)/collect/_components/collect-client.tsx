'use client'

import { useState } from 'react'
import { Plus, Trash2, Star, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AddOwnedModal } from './add-owned-modal'
import { CoinSelector } from './coin-selector'

export interface CollectionItem {
  id: string
  type: 'owned' | 'wishlist'
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
  created_at: string
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function OwnedCard({ item, onDelete }: { item: CollectionItem; onDelete: () => void }) {
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

  return (
    <div className="group relative rounded-2xl border border-border bg-background overflow-hidden hover:shadow-md transition-shadow">
      {/* Image area */}
      <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
        {item.pcgs_image_url ? (
          <img
            src={item.pcgs_image_url}
            alt={item.coin_name}
            className="w-full h-full object-contain mix-blend-multiply"
          />
        ) : (
          <Coins className="h-12 w-12 text-muted-foreground/20" />
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Info */}
      <div className="p-4">
        {(item.grading_service || item.grade) && (
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-1">
            {[item.grading_service, item.grade].filter(Boolean).join(' · ')}
            {item.year && <span className="font-mono normal-case tracking-normal"> · {item.year}{item.mint_mark ? `-${item.mint_mark}` : ''}</span>}
          </p>
        )}
        <p className="text-[14px] font-semibold leading-snug line-clamp-2 text-foreground">
          {item.coin_name}
        </p>
        {item.cert_number && (
          <p className="text-[11px] text-muted-foreground mt-1">Cert #{item.cert_number}</p>
        )}
        {item.notes && (
          <p className="text-[12px] text-muted-foreground/70 mt-1.5 line-clamp-1 italic">{item.notes}</p>
        )}
      </div>
    </div>
  )
}

function WishlistCard({ item, onDelete }: { item: CollectionItem; onDelete: () => void }) {
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

  return (
    <div className="group relative rounded-2xl border border-border bg-background overflow-hidden hover:shadow-md transition-shadow">
      {/* Icon area */}
      <div className="aspect-square bg-muted/40 flex items-center justify-center">
        <Star className="h-10 w-10 text-muted-foreground/20" />
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/90 backdrop-blur-sm border border-border rounded-full p-1.5 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Info */}
      <div className="p-4">
        {item.grading_service && (
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-1">
            {item.grading_service}{item.grade ? ` · ${item.grade}` : ''}
          </p>
        )}
        <p className="text-[14px] font-semibold leading-snug line-clamp-2 text-foreground">
          {item.coin_name}
        </p>
        {item.max_price && (
          <p className="text-[12px] text-muted-foreground mt-1">
            Max: {formatPrice(item.max_price)}
          </p>
        )}
        {item.notes && (
          <p className="text-[12px] text-muted-foreground/70 mt-1.5 line-clamp-1 italic">{item.notes}</p>
        )}
      </div>
    </div>
  )
}

type Tab = 'owned' | 'wishlist'

export function CollectClient({ initialItems }: { initialItems: CollectionItem[] }) {
  const [tab, setTab] = useState<Tab>('owned')
  const [items, setItems] = useState<CollectionItem[]>(initialItems)
  const [showOwned, setShowOwned] = useState(false)
  const [showWishlist, setShowWishlist] = useState(false)

  const owned = items.filter(i => i.type === 'owned')
  const wishlist = items.filter(i => i.type === 'wishlist')

  const refresh = async () => {
    const res = await fetch('/api/collection')
    const json = await res.json()
    if (json.data) setItems(json.data)
  }

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'owned', label: 'Owned', count: owned.length },
    { id: 'wishlist', label: 'Wish List', count: wishlist.length },
  ]

  const visible = tab === 'owned' ? owned : wishlist

  return (
    <div>
      {/* Tabs + Add button */}
      <div className="flex items-center justify-between mb-8 border-b border-border">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 text-[11px] text-muted-foreground/60 font-normal">{t.count}</span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="pb-2">
          {tab === 'owned' ? (
            <Button size="sm" onClick={() => setShowOwned(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Owned
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowWishlist(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add to Wish List
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tab === 'owned'
            ? owned.map(item => (
                <OwnedCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
              ))
            : wishlist.map(item => (
                <WishlistCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
              ))
          }
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground border border-dashed rounded-2xl">
          {tab === 'owned' ? (
            <>
              <Coins className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-base font-medium mb-1.5">No coins in your collection yet</p>
              <p className="text-sm mb-5">Look up a cert number to add your graded coins.</p>
              <Button variant="outline" size="sm" onClick={() => setShowOwned(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add your first coin
              </Button>
            </>
          ) : (
            <>
              <Star className="h-10 w-10 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-base font-medium mb-1.5">Your wish list is empty</p>
              <p className="text-sm mb-5">Track coins you're hunting for.</p>
              <Button variant="outline" size="sm" onClick={() => setShowWishlist(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add your first coin
              </Button>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showOwned && (
        <AddOwnedModal
          onClose={() => setShowOwned(false)}
          onAdded={() => { setShowOwned(false); refresh() }}
        />
      )}
      {showWishlist && (
        <CoinSelector
          onClose={() => setShowWishlist(false)}
          onAdded={() => { setShowWishlist(false); refresh() }}
        />
      )}
    </div>
  )
}
