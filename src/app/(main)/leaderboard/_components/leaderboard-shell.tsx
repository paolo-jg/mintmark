'use client'

import { useEffect, useState } from 'react'
import { LeaderboardClient } from './leaderboard-client'

interface Entry {
  rank: number
  id: string
  name: string
  username: string
  volume: number
}

export function LeaderboardShell() {
  const [data, setData] = useState<{ topSellers: Entry[]; topBuyers: Entry[] } | null>(null)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ topSellers: [], topBuyers: [] }))
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground mt-1">Top collectors and dealers ranked by trading volume.</p>
      </div>
      {data ? (
        <LeaderboardClient topSellers={data.topSellers} topBuyers={data.topBuyers} />
      ) : (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 rounded-xl bg-muted/40" />
          ))}
        </div>
      )}
    </div>
  )
}
