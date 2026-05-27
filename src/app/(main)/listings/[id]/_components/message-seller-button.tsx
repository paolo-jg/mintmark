'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageSellerModal } from './message-seller-modal'

interface Props {
  listingId: string
  sellerId: string
  sellerPublicKeyJwk: JsonWebKey | null
}

export function MessageSellerButton({ listingId, sellerId, sellerPublicKeyJwk }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12 text-base"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        Message Seller
      </Button>
      {open && (
        <MessageSellerModal
          listingId={listingId}
          sellerId={sellerId}
          sellerPublicKeyJwk={sellerPublicKeyJwk}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
