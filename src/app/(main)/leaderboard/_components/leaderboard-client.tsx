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

const MEDALS = ['🥇', '🥈', '🥉']

const AVATAR_BG: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-slate-200 text-slate-700',
  3: 'bg-orange-100 text-orange-700',
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className="text-xl w-7 text-center shrink-0">{MEDALS[rank - 1]}</span>
  }
  return (
    <span className="text-sm font-medium text-muted-foreground w-7 text-center shrink-0 tabular-nums">
      {rank}
    </span>
  )
}

function Avatar({ name, rank }: { name: string; rank: number }) {
  const initial = name.replace(/^@/, '').charAt(0).toUpperCase()
  const cls = rank <= 3 ? AVATAR_BG[rank] : 'bg-muted text-muted-foreground'
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${cls}`}>
      {initial}
    </div>
  )
}

function LeaderboardList({ entries }: { entries: Entry[] }) {
  if (!entries.length) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-2xl">
        <p className="text-muted-foreground text-sm">
          No trading activity yet. Be the first to buy or sell!
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
      {entries.map(entry => (
        <Link
          key={entry.id}
          href={`/sellers/${entry.id}`}
          className="flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/40 transition-colors"
        >
          <RankBadge rank={entry.rank} />
          <Avatar name={entry.name} rank={entry.rank} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{entry.name}</p>
            {entry.username && (
              <p className="text-xs text-muted-foreground truncate">@{entry.username}</p>
            )}
          </div>
          <p className="font-bold text-sm tabular-nums shrink-0">{formatCents(entry.volume)}</p>
        </Link>
      ))}
    </div>
  )
}

export function LeaderboardClient({ topSellers, topBuyers }: Props) {
  const [activeTab, setActiveTab] = useState<'sellers' | 'buyers'>('sellers')

  const tabs: { id: 'sellers' | 'buyers'; label: string }[] = [
    { id: 'sellers', label: 'Top Sellers' },
    { id: 'buyers', label: 'Top Buyers' },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <LeaderboardList entries={activeTab === 'sellers' ? topSellers : topBuyers} />
    </div>
  )
}
