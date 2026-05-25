'use client'

import { SWRConfig } from 'swr'

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        dedupingInterval: 30_000, // 30s — same key won't re-fetch within this window
      }}
    >
      {children}
    </SWRConfig>
  )
}
