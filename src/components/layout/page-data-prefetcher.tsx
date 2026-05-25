'use client'

import { useEffect } from 'react'
import { preload } from 'swr'
import { fetchHomeData } from '@/app/(main)/_components/home-client'
import { fetchSellData } from '@/app/(main)/sell/_components/sell-client'
import { fetchCollectionItems } from '@/app/(main)/collect/_components/collect-client'
import { fetchBuyNowData } from '@/app/(main)/buy-now/_components/buy-now-client'
import { fetchAuctionsData } from '@/app/(main)/auctions/_components/auctions-client'

/**
 * Fires off background SWR fetches for every page as soon as the app loads.
 * By the time the user clicks any nav link the data is already in cache — instant render.
 * preload() respects the SWR dedupingInterval so it only fetches once per 30s.
 */
export function PageDataPrefetcher() {
  useEffect(() => {
    preload('home-dashboard', fetchHomeData)
    preload('sell-dashboard', fetchSellData)
    preload('collect-items', fetchCollectionItems)
    preload('buy-now-listings', fetchBuyNowData)
    preload('auctions-live', fetchAuctionsData)
  }, [])

  return null
}
