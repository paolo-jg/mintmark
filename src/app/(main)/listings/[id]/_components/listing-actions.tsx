'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { BuyNowModal } from './buy-now-modal'
import { BidModal } from './bid-modal'
import { Pencil, Trash2, AlertTriangle, X, Loader2, Clock, Gavel } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Tiers that have a monthly listing cap
const CAPPED_TIERS = new Set([
  'collector_basic',
  'collector_standard',
  'collector_premium',
])

export interface AuctionData {
  id: string
  current_bid: number
  start_price: number
  end_time: string
  bid_count: number
  reserve_price: number | null
}

interface Props {
  listing: {
    id: string
    price: number | null
    coin_name: string | null
    seller_id: string
    status: string
    listing_type: string
    pass_convenience_fee: boolean
    accept_offers: boolean
    collection_item_id?: string | null
  }
  isOwner: boolean
  sellerTier?: string
  auction?: AuctionData | null
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({
  listing,
  sellerTier,
  onClose,
}: {
  listing: Props['listing']
  sellerTier: string
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)
  const isCapped = CAPPED_TIERS.has(sellerTier)

  const handleDelete = async () => {
    setDeleting(true)

    const { error } = await supabase
      .from('listings')
      .update({ status: 'expired' })
      .eq('id', listing.id)

    if (error) {
      toast.error(error.message)
      setDeleting(false)
      return
    }

    // Return the coin to the collection as 'owned'
    if (listing.collection_item_id) {
      await supabase
        .from('collection_items')
        .update({ status: 'owned' })
        .eq('id', listing.collection_item_id)
    }

    toast.success('Listing deleted')
    router.push('/sell')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-base font-semibold">Delete listing?</h2>
          <button
            onClick={onClose}
            disabled={deleting}
            className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{listing.coin_name ?? 'This listing'}</span> will
            be removed and no longer visible to buyers.
          </p>

          {/* Capped-tier warning */}
          {isCapped && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Deleting this listing <strong>will not free up a listing slot</strong>. It still counts toward your monthly total for this period.
              </p>
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm font-medium h-8 px-3 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {deleting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                : <><Trash2 className="h-3.5 w-3.5" /> Delete</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(endTime: string) {
  const [msLeft, setMsLeft] = useState(() => new Date(endTime).getTime() - Date.now())

  useEffect(() => {
    // Snap immediately when endTime changes
    setMsLeft(new Date(endTime).getTime() - Date.now())

    const id = setInterval(() => {
      setMsLeft(new Date(endTime).getTime() - Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [endTime])

  return msLeft
}

function formatCountdown(ms: number): { label: string; urgent: boolean } {
  if (ms <= 0) return { label: 'Ended', urgent: true }
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return { label: `${d}d ${h % 24}h left`, urgent: false }
  }
  if (h >= 1) return { label: `${h}h ${m}m left`, urgent: h < 1 }
  if (m >= 1) return { label: `${m}m ${s}s left`, urgent: true }
  return { label: `${s}s left`, urgent: true }
}

// ── Live auction section ───────────────────────────────────────────────────────

function AuctionSection({
  listing,
  initialAuction,
}: {
  listing: Props['listing']
  initialAuction: AuctionData
}) {
  const supabase = createClient()
  const [currentBid,  setCurrentBid]  = useState(initialAuction.current_bid)
  const [endTime,     setEndTime]      = useState(initialAuction.end_time)
  const [bidCount,    setBidCount]     = useState(initialAuction.bid_count)
  const [showBidModal, setShowBidModal] = useState(false)

  const msLeft = useCountdown(endTime)
  const { label, urgent } = formatCountdown(msLeft)
  const ended = msLeft <= 0

  const onBidPlaced = useCallback(
    (newBid: number, newEndTime: string, newBidCount: number) => {
      setCurrentBid(newBid)
      setEndTime(newEndTime)
      setBidCount(newBidCount)
    },
    []
  )

  // Realtime subscription — live updates when anyone places a bid
  useEffect(() => {
    const channel = supabase
      .channel(`auction-detail:${initialAuction.id}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'auctions',
          filter: `id=eq.${initialAuction.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            current_bid: number
            end_time: string
            bid_count: number
          }
          setCurrentBid(updated.current_bid)
          setEndTime(updated.end_time)
          setBidCount(updated.bid_count)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialAuction.id, supabase])

  const reserveNotMet =
    initialAuction.reserve_price != null &&
    currentBid < initialAuction.reserve_price

  return (
    <>
      {/* Live bid display */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-0.5">
              Current Bid
            </p>
            <p className="text-2xl font-bold tabular-nums">{formatCents(currentBid)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-0.5">
              Time Left
            </p>
            <div className={`flex items-center gap-1 justify-end text-base font-semibold tabular-nums ${
              urgent ? 'text-red-500' : 'text-foreground'
            }`}>
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Gavel className="h-3 w-3" />
            {bidCount === 0 ? 'No bids yet' : `${bidCount} bid${bidCount !== 1 ? 's' : ''}`}
          </span>
          {reserveNotMet && (
            <span className="text-amber-600 font-medium">Reserve not met</span>
          )}
        </div>
      </div>

      {/* Bid button */}
      <div className="space-y-2.5">
        <Button
          size="lg"
          className="w-full h-12 text-base"
          disabled={ended}
          onClick={() => setShowBidModal(true)}
        >
          {ended ? 'Auction Ended' : 'Place Bid'}
        </Button>
      </div>

      {showBidModal && (
        <BidModal
          auctionId={initialAuction.id}
          currentBid={currentBid}
          endTime={endTime}
          onClose={() => setShowBidModal(false)}
          onBidPlaced={onBidPlaced}
        />
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ListingActions({
  listing,
  isOwner,
  sellerTier = 'collector_basic',
  auction,
}: Props) {
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  if (isOwner) {
    return (
      <>
        <div className="space-y-2.5">
          {listing.status === 'active' && (
            <Button render={<Link href={`/listings/${listing.id}/edit`} />} variant="outline" size="lg" className="w-full h-12 text-base">
              <Pencil className="h-4 w-4 mr-2" />
              Edit Listing
            </Button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 text-sm font-medium h-10 px-4 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Listing
          </button>
          {listing.status !== 'active' && (
            <p className="text-xs text-center text-muted-foreground capitalize">
              This listing is {listing.status}
            </p>
          )}
        </div>

        {showDeleteModal && (
          <DeleteModal
            listing={listing}
            sellerTier={sellerTier}
            onClose={() => setShowDeleteModal(false)}
          />
        )}
      </>
    )
  }

  if (listing.status !== 'active') {
    return null
  }

  // ── Auction listing ───────────────────────────────────────────────────────
  if (listing.listing_type === 'auction') {
    if (auction) {
      return <AuctionSection listing={listing} initialAuction={auction} />
    }
    // Fallback: auction data not available
    return (
      <Button size="lg" className="w-full h-12 text-base" disabled>
        Place Bid
      </Button>
    )
  }

  // ── Fixed-price / offer listing ───────────────────────────────────────────
  return (
    <>
      <div className="space-y-2.5">
        <Button
          size="lg"
          className="w-full h-12 text-base"
          onClick={() => setShowBuyModal(true)}
        >
          Buy Now{listing.price ? ` · ${formatCents(listing.price)}` : ''}
        </Button>
        {listing.accept_offers && (
          <Button variant="outline" size="lg" className="w-full h-12 text-base" disabled>
            Make Offer
          </Button>
        )}
      </div>

      {showBuyModal && (
        <BuyNowModal
          listing={listing}
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </>
  )
}
