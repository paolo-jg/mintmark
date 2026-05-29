'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { EditForm } from './edit-form'

export function EditListingClient({ id }: { id: string }) {
  const router = useRouter()
  const [data, setData] = useState<{ listing: any; auction: any; sellerTier: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace(`/auth/login?redirectTo=/listings/${id}/edit`); return }

      const [{ data: listing }, { data: profile }, { data: auction }] = await Promise.all([
        supabase.from('listings').select('*').eq('id', id).single(),
        supabase.from('profiles').select('subscription_tier').eq('id', user.id).single(),
        supabase.from('auctions').select('*').eq('listing_id', id).maybeSingle(),
      ])

      if (!listing) { router.replace('/sell'); return }

      if (listing.seller_id !== user.id) {
        const { data: membership } = await supabase
          .from('team_members').select('dealer_id')
          .eq('user_id', user.id).eq('dealer_id', listing.seller_id).maybeSingle()
        if (!membership) { router.replace('/sell'); return }
      }

      setData({ listing, auction: auction ?? null, sellerTier: profile?.subscription_tier ?? 'collector_basic' })
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-96 bg-muted/40 rounded-xl" />
      </div>
    )
  }

  if (!data) return null
  const { listing, auction, sellerTier } = data

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href={listing.status === 'draft' ? '/sell?tab=draft' : `/listings/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {listing.status === 'draft' ? 'Back to Drafts' : 'Back to listing'}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Edit Listing</h1>
        <p className="text-sm text-muted-foreground mt-1 truncate">{listing.title}</p>
      </div>

      <EditForm listing={listing} auction={auction} sellerTier={sellerTier} />
    </div>
  )
}
