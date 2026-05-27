'use client'

import { useState, useEffect } from 'react'

interface Props {
  endTime: string
  className?: string
}

export function AuctionCountdown({ endTime, className = '' }: Props) {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceRender(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const ms = new Date(endTime).getTime() - Date.now()

  if (ms <= 0) return <span className={`text-destructive font-medium ${className}`}>Ended</span>

  const totalSecs = Math.floor(ms / 1000)
  const days  = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60

  if (days > 1)  return <span className={className}>{days}d {hours}h</span>
  if (days === 1) return <span className={`text-amber-600 font-medium ${className}`}>1d {hours}h {mins}m</span>
  if (hours > 0) return <span className={`text-amber-600 font-medium ${className}`}>{hours}h {mins}m</span>
  return <span className={`text-destructive font-semibold ${className}`}>{mins}m {secs}s</span>
}
