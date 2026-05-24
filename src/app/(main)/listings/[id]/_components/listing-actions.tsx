'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatCents } from '@/lib/utils'
import { BuyNowModal } from './buy-now-modal'

interface Props {
  listing: {
    id: string
    price: number | null
    coin_name: string | null
    seller_id: string
    status: string
    listing_type: string
  }
  isOwner: boolean
}

export function ListingActions({ listing, isOwner }: Props) {
  const [showBuyModal, setShowBuyModal] = useState(false)

  if (isOwner) {
    return (
      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground text-center">
        This is your listing
      </div>
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
        <Button variant="outline" size="lg" className="w-full h-12 text-base" disabled>
          Make Offer
        </Button>
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
