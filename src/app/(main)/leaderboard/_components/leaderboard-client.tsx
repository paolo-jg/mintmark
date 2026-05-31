'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCents } from '@/lib/utils'

interface Entry {
  rank: number
  id: string
  name: string
  username: string
  volume: number
}

interface Props {
  topSellers: Entry[]
  topBuyers: Entry[]
}

const ROW_STYLES: Record<number, string> = {
  1: 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  2: 'bg-slate-50/60 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/30',
  3: 'bg-orange-50/40 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20',
}

const MEDAL_SRC: Record<1 | 2 | 3, string> = {
  1: '/medals/1st.svg',
  2: '/medals/2nd.svg',
  3: '/medals/3rd.svg',
}

function MedalBadge({ rank }: { rank: 1 | 2 | 3 }) {
  return (
    <img
      src={MEDAL_SRC[rank]}
      alt={`Rank ${rank}`}
      className="shrink-0 h-14 w-14 object-contain"
    />
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1 || rank === 2 || rank === 3) {
    return <MedalBadge rank={rank} />
  }
  return (
    <div className="w-10 flex items-center justify-center shrink-0">
      <span className="text-sm text-muted-foreground tabular-nums">{rank}</span>
    </div>
  )
}

function LeaderboardList({ entries }: { entries: Entry[] }) {
  if (!entries.length) {
    return (
      <div className="text-center py-24 border border-dashed border-border rounded-2xl">
        <p className="text-muted-foreground text-sm">No trading activity yet. Be the first to buy or sell!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {entries.map(entry => {
        const rowCls = ROW_STYLES[entry.rank] ?? 'bg-card hover:bg-muted/30'
        return (
          <Link
            key={entry.id}
            href={`/sellers/${entry.id}`}
            className={`flex items-center gap-4 px-5 py-4 transition-colors ${rowCls}`}
          >
            <RankBadge rank={entry.rank} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{entry.name}</p>
              {entry.username && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">@{entry.username}</p>
              )}
            </div>
            <p className="font-bold text-base tabular-nums shrink-0">{formatCents(entry.volume)}</p>
          </Link>
        )
      })}
    </div>
  )
}

export function LeaderboardClient({ topSellers, topBuyers }: Props) {
  const [activeTab, setActiveTab] = useState<'sellers' | 'buyers'>('sellers')

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6">
        {(['sellers', 'buyers'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'sellers' ? 'Top Sellers' : 'Top Buyers'}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>
      <LeaderboardList entries={activeTab === 'sellers' ? topSellers : topBuyers} />
    </div>
  )
}
