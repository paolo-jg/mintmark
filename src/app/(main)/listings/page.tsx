import { Suspense } from 'react'
import { ListingsPageClient } from './_components/listings-page-client'

export const metadata = {
  title: 'Explore Listings | Pedigree Coins',
}

// Suspense required because ListingsPageClient uses useSearchParams()
export default function ListingsPage() {
  return (
    <Suspense>
      <ListingsPageClient />
    </Suspense>
  )
}
