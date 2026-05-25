import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EditForm } from './_components/edit-form'

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [
    { data: listing },
    { data: profile },
    { data: auction },
  ] = await Promise.all([
    supabase.from('listings').select('*').eq('id', id).single(),
    supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
    supabase.from('auctions').select('*').eq('listing_id', id).maybeSingle(),
  ])

  if (!listing) notFound()
  if (listing.seller_id !== user.id) notFound()

  const sellerTier = (profile?.subscription_tier ?? 'collector_basic') as string

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={`/listings/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Back to listing
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Edit Listing</h1>
        <p className="text-sm text-muted-foreground mt-1 truncate">{listing.title}</p>
      </div>

      <EditForm listing={listing} auction={auction} sellerTier={sellerTier} />
    </div>
  )
}
