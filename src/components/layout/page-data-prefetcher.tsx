'use client'

import { preload } from 'swr'
import { fetchHomeData } from '@/app/(main)/_components/home-client'
import { fetchSellData } from '@/app/(main)/sell/_components/sell-client'
import { fetchCollectionItems } from '@/app/(main)/collect/_components/collect-client'
import { fetchBuyNowData } from '@/app/(main)/buy-now/_components/buy-now-client'
import { fetchAuctionsData } from '@/app/(main)/auctions/_components/auctions-client'
import { fetchDealersData } from '@/app/(main)/dealers/_components/dealers-client'

// Fire preloads only in browser - module-level but guarded so SSR prerendering
// doesn't attempt to create browser Supabase clients on the server.
if (typeof window !== 'undefined') {
  preload('home-dashboard',   fetchHomeData)
  preload('sell-dashboard',   fetchSellData)
  preload('collect-items',    fetchCollectionItems)
  preload('buy-now-listings', fetchBuyNowData)
  preload('auctions-live',    fetchAuctionsData)
  preload('dealers-list',     fetchDealersData)
}

export function PageDataPrefetcher() {
  return null
}
