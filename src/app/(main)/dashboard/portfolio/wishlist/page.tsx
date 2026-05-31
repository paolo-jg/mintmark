export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { WishlistCostClient } from '../_components/wishlist-cost-client'

export const metadata = { title: 'Wishlist Cost – Pedigree Coins' }

export default function WishlistCostPage() {
  return (
    <Suspense>
      <WishlistCostClient />
    </Suspense>
  )
}
