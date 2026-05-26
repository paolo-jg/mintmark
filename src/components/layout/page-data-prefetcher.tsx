'use client'

import { preload } from 'swr'
import { fetchHomeData } from '@/app/(main)/_components/home-client'
import { fetchSellData } from '@/app/(main)/sell/_components/sell-client'
import { fetchCollectionItems } from '@/app/(main)/collect/_components/collect-client'
import { fetchBuyNowData } from '@/app/(main)/buy-now/_components/buy-now-client'
import { fetchAuctionsData } from '@/app/(main)/auctions/_components/auctions-client'
import { fetchDealersData } from '@/app/(main)/dealers/_components/dealers-client'

// Fire preloads at module-evaluation time — the moment this module is imported
// the fetches are already in-flight. No useEffect delay means data is ready
// before the user has a chance to navigate anywhere.
// preload() deduplicates within SWR's dedupingInterval so it's safe to call repeatedly.
preload('home-dashboard',   fetchHomeData)
preload('sell-dashboard',   fetchSellData)
preload('collect-items',    fetchCollectionItems)
preload('buy-now-listings', fetchBuyNowData)
preload('auctions-live',    fetchAuctionsData)
preload('dealers-list',     fetchDealersData)

export function PageDataPrefetcher() {
  return null
}
