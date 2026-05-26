'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_MS  = 30 * 60 * 1000 // 30 minutes
const HEARTBEAT_MS   = 5_000           // update tab registry every 5s
const STALE_TAB_MS   = 12_000          // tab considered gone after 12s with no heartbeat
const TABS_KEY       = 'pc_open_tabs'
const TAB_ID_KEY     = 'pc_tab_id'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

export function InactivityGuard() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()

    async function doSignOut() {
      await supabase.auth.signOut()
      window.location.href = process.env.NEXT_PUBLIC_MARKETING_URL || '/'
    }

    function resetTimer() {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(doSignOut, INACTIVITY_MS)
    }

    // ── Inactivity tracking ──────────────────────────────────────────────────
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    // ── Tab lifecycle tracking ───────────────────────────────────────────────
    type TabEntry = { id: string; ts: number }

    function getActiveTabs(): TabEntry[] {
      try {
        const raw = localStorage.getItem(TABS_KEY)
        const tabs: TabEntry[] = raw ? JSON.parse(raw) : []
        return tabs.filter(t => Date.now() - t.ts < STALE_TAB_MS)
      } catch {
        return []
      }
    }

    function saveTabs(tabs: TabEntry[]) {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
    }

    let tabId = sessionStorage.getItem(TAB_ID_KEY)
    const isFreshTab = !tabId

    if (isFreshTab) {
      tabId = crypto.randomUUID()
      sessionStorage.setItem(TAB_ID_KEY, tabId)

      // Fresh open with no other active tabs → sign out any lingering session
      const activeTabs = getActiveTabs()
      if (activeTabs.length === 0) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) doSignOut()
        })
      }
    }

    // Heartbeat keeps this tab's registry entry fresh
    const id = tabId!
    function beat() {
      const others = getActiveTabs().filter(t => t.id !== id)
      saveTabs([...others, { id, ts: Date.now() }])
    }
    const heartbeat = setInterval(beat, HEARTBEAT_MS)
    beat()

    // Remove this tab from the registry on close/navigate-away
    function handleUnload() {
      saveTabs(getActiveTabs().filter(t => t.id !== id))
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearTimeout(timerRef.current)
      clearInterval(heartbeat)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  return null
}
