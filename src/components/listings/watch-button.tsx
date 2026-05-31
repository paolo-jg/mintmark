'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

async function fetchWatchlistIds(): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('listing_watchlist').select('listing_id')
  return (data ?? []).map((r: { listing_id: string }) => r.listing_id)
}

export function WatchButton({
  listingId,
  className,
}: {
  listingId: string
  className?: string
}) {
  const { data: watchlistIds = [] } = useSWR('watchlist-ids', fetchWatchlistIds)
  const watching = watchlistIds.includes(listingId)
  const [pending, setPending] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    setPending(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/auth/login'
      return
    }

    // Optimistic update
    const next = watching
      ? watchlistIds.filter(id => id !== listingId)
      : [...watchlistIds, listingId]
    globalMutate('watchlist-ids', next, false)
    globalMutate('watchlist', undefined, false)

    if (watching) {
      await supabase.from('listing_watchlist').delete().eq('listing_id', listingId).eq('user_id', user.id)
    } else {
      await supabase.from('listing_watchlist').insert({ listing_id: listingId, user_id: user.id })
    }

    globalMutate('watchlist-ids')
    globalMutate('watchlist')
    setPending(false)
  }

  return (
    <button
      onClick={toggle}
      aria-label={watching ? 'Remove from watchlist' : 'Add to watchlist'}
      className={`flex items-center justify-center rounded-full transition-colors ${
        watching
          ? 'text-red-500 hover:text-red-600'
          : 'text-muted-foreground hover:text-foreground'
      } ${className ?? ''}`}
    >
      <Heart className={`h-4 w-4 ${watching ? 'fill-current' : ''}`} />
    </button>
  )
}
