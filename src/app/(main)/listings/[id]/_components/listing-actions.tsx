'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { BuyNowModal } from './buy-now-modal'
import { Pencil, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Tiers that have a monthly listing cap
const CAPPED_TIERS = new Set([
  'collector_basic',
  'collector_standard',
  'collector_premium',
])

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

// ── Main component ────────────────────────────────────────────────────────────

export function ListingActions({ listing, isOwner, sellerTier = 'collector_basic' }: Props) {
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

  return (
    <>
      <div className="space-y-2.5">
        {listing.listing_type === 'auction' ? (
          <Button size="lg" className="w-full h-12 text-base" disabled>
            Place Bid
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={() => setShowBuyModal(true)}
          >
            Buy Now{listing.price ? ` · ${formatCents(listing.price)}` : ''}
          </Button>
        )}
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
