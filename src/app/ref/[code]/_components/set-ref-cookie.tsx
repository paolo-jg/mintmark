'use client'

import { useEffect } from 'react'

export function SetRefCookie({ code }: { code: string }) {
  useEffect(() => {
    document.cookie = `pc_ref=${code}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
  }, [code])
  return null
}
