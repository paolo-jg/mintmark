import { Suspense } from 'react'
import { EditListingClient } from './_components/edit-listing-client'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Suspense><EditListingClient id={id} /></Suspense>
}
