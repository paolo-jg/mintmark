'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useState } from 'react'
import { formatCents } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Package, ShoppingBag, Gavel, CheckCircle2, AlertTriangle, Clock, ExternalLink, Loader2, ChevronRight } from 'lucide-react'
import { AuctionCountdown } from '@/components/ui/auction-countdown'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_shipment: 'Awaiting Shipment',
  label_purchased: 'Label Purchased',
  shipped: 'Shipped',
  delivered: 'Delivered',
  disputed: 'Disputed',
  complete: 'Complete',
  cancelled: 'Cancelled',
}

const ORDER_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  awaiting_shipment: 'secondary',
  label_purchased: 'secondary',
  shipped: 'default',
  delivered: 'default',
  disputed: 'destructive',
  complete: 'outline',
  cancelled: 'secondary',
}

type TabId = 'purchases' | 'bids'

interface Order {
  id: string
  status: string
  amount: number
  created_at: string
  listing_id: string
  listings: {
    coin_name: string | null
    grading_service_image_url: string | null
    year: number | null
    grade: string | null
    grading_service: string | null
  } | null
  shipments: { tracking_status: string | null; tracking_number: string | null; carrier: string | null }[]
}

interface Bid {
  id: string
  amount: number
  created_at: string
  hold_status: string
  auction_id: string
  auctions: {
    id: string
    end_time: string
    current_bid: number | null
    start_price: number
    bid_count: number
    listings: {
      id: string
      coin_name: string | null
      grading_service_image_url: string | null
      year: number | null
      grade: string | null
      grading_service: string | null
    } | null
  } | null
}

interface MyOrdersData {
  orders: Order[]
  bids: Bid[]
}

function ConfirmButton({ orderId, onConfirmed }: { orderId: string; onConfirmed: () => void }) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to confirm receipt'); return }
      toast.success('Receipt confirmed. Payout releases to seller in 48 hours.')
      onConfirmed()
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      Mark received
    </button>
  )
}

function DisputeButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  async function handle() {
    if (!reason.trim()) { toast.error('Please describe the issue'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Failed to file dispute'); return }
      toast.success('Dispute filed. Our team will review it shortly.')
      setOpen(false)
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (open) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-medium">Describe the issue</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Coin does not match description, wrong coin received..."
          className="w-full text-xs rounded-md border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2">
          <button
            onClick={handle}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:opacity-80 transition-opacity"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Submit dispute
          </button>
          <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs font-semibold text-destructive/80 hover:text-destructive transition-colors"
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Open dispute
    </button>
  )
}

function OrderCard({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const listing = order.listings
  const shipment = order.shipments?.[0] ?? null
  const canConfirm = order.status === 'delivered' || order.status === 'shipped'
  const canDispute = order.status === 'shipped' || order.status === 'delivered'
  const isComplete = order.status === 'complete'
  const isDisputed = order.status === 'disputed'

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {listing?.grading_service_image_url ? (
            <img src={listing.grading_service_image_url} alt="" className="h-12 w-12 rounded-lg object-contain bg-muted flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {listing?.coin_name ?? 'Unknown coin'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[listing?.grading_service, listing?.grade].filter(Boolean).join(' ')}
              {listing?.year ? ` · ${listing.year}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Order #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <p className="text-sm font-semibold">{formatCents(order.amount)}</p>
          <Badge variant={ORDER_STATUS_VARIANT[order.status] ?? 'secondary'} className="text-xs">
            {ORDER_STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
      </div>

      {shipment?.tracking_number && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{shipment.carrier ?? 'Carrier'} · {shipment.tracking_number}</span>
        </div>
      )}

      {isDisputed && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          Dispute in progress. Our team is reviewing this order.
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 flex-wrap">
        <Link
          href={`/orders/${order.id}`}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View details
        </Link>
        {canConfirm && !isComplete && (
          <ConfirmButton orderId={order.id} onConfirmed={onRefresh} />
        )}
        {canDispute && !isDisputed && !isComplete && (
          <DisputeButton orderId={order.id} />
        )}
        {isComplete && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Complete
          </span>
        )}
      </div>

      {(canDispute && !isDisputed && !isComplete) && (
        <div className="mt-1" id={`dispute-${order.id}`} />
      )}
    </div>
  )
}

function BidCard({ bid }: { bid: Bid }) {
  const auction = bid.auctions
  const listing = auction?.listings
  const isLeading = auction?.current_bid === bid.amount
  const isEnded = auction ? new Date(auction.end_time) < new Date() : false

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {listing?.grading_service_image_url ? (
            <img src={listing.grading_service_image_url} alt="" className="h-12 w-12 rounded-lg object-contain bg-muted flex-shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Gavel className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {listing?.coin_name ?? 'Unknown coin'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[listing?.grading_service, listing?.grade].filter(Boolean).join(' ')}
              {listing?.year ? ` · ${listing.year}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your bid: <span className="font-medium text-foreground">{formatCents(bid.amount)}</span>
              {auction && (
                <> · Current high: <span className="font-medium text-foreground">{formatCents(auction.current_bid ?? auction.start_price)}</span></>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {isEnded ? (
            <Badge variant="secondary" className="text-xs">Ended</Badge>
          ) : isLeading ? (
            <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">Leading</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">Outbid</Badge>
          )}
          {auction && !isEnded && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <AuctionCountdown endTime={auction.end_time} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
        {listing?.id && (
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View auction
          </Link>
        )}
        {!isLeading && !isEnded && listing?.id && (
          <Link
            href={`/listings/${listing.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:opacity-80 transition-opacity"
          >
            <Gavel className="h-3.5 w-3.5" />
            Bid again
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}

export function MyOrdersClient() {
  const [tab, setTab] = useState<TabId>('purchases')
  const { data, isLoading, mutate } = useSWR<MyOrdersData>('/api/my-orders', fetcher)

  const orders = data?.orders ?? []
  const bids = data?.bids ?? []

  const activeBids = bids.filter(b => {
    if (!b.auctions) return false
    return new Date(b.auctions.end_time) > new Date()
  })
  const endedBids = bids.filter(b => {
    if (!b.auctions) return false
    return new Date(b.auctions.end_time) <= new Date()
  })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Track purchases and auction bids</p>
        </div>
        <Link
          href="/listings"
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Browse listings
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 mb-6 w-fit">
        {([
          { id: 'purchases', label: 'Purchases', icon: ShoppingBag, count: orders.length },
          { id: 'bids', label: 'Auction Bids', icon: Gavel, count: activeBids.length || undefined },
        ] as const).map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === id ? 'bg-foreground text-background' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card px-5 py-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-12 w-12 rounded-lg bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'purchases' ? (
        orders.length === 0 ? (
          <div className="text-center py-24 border border-dashed rounded-xl text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium mb-1">No purchases yet</p>
            <p className="text-sm mb-4">When you buy a coin, it will appear here.</p>
            <Link href="/listings" className="text-sm font-medium text-foreground underline underline-offset-2">
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onRefresh={mutate} />
            ))}
          </div>
        )
      ) : (
        bids.length === 0 ? (
          <div className="text-center py-24 border border-dashed rounded-xl text-muted-foreground">
            <Gavel className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-base font-medium mb-1">No auction bids</p>
            <p className="text-sm mb-4">Place a bid on a live auction to track it here.</p>
            <Link href="/auctions" className="text-sm font-medium text-foreground underline underline-offset-2">
              View live auctions
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {activeBids.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active auctions</h2>
                <div className="space-y-4">
                  {activeBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
                </div>
              </section>
            )}
            {endedBids.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ended</h2>
                <div className="space-y-4">
                  {endedBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
                </div>
              </section>
            )}
          </div>
        )
      )}
    </div>
  )
}
