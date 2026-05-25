import { Suspense } from 'react'
import NewListingForm from './_components/new-listing-form'

export const metadata = {
  title: 'List a Coin — Pedigree Coins',
}

// Suspense required because NewListingForm uses useSearchParams()
export default function NewListingPage() {
  return (
    <Suspense>
      <NewListingForm />
    </Suspense>
  )
}
