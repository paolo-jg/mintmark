import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Gavel } from 'lucide-react'
import { AuctionsClient } from './_components/auctions-client'
import type { AuctionRow } from './_components/auctions-client'

export default async function AuctionsPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('auctions')
    .select('*, listing:listings(id, title, coin_name, grading_service, grade, year, mint_mark, denomination, verification_status, images)')
    .gt('end_time', new Date().toISOString())
    .limit(96)

  const auctions: AuctionRow[] = (raw ?? []).filter(a => a.listing)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {auctions.length > 0
              ? `${auctions.length} active auction${auctions.length !== 1 ? 's' : ''} — bid now before time runs out`
              : 'No live auctions right now — check back soon'}
          </p>
        </div>
        <Link
          href="/listings/new"
          className="flex-none flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-foreground/40 hover:bg-muted transition-colors whitespace-nowrap"
        >
          List a Coin
        </Link>
      </div>

      <AuctionsClient auctions={auctions} />

    </div>
  )
}
