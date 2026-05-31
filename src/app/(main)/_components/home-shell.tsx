'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LandingPage } from './landing-page'
import { HomeClient } from './home-client'

export function HomeShell() {
  const [view, setView] = useState<'landing' | 'home'>('landing')

  useEffect(() => {
    const hostname = window.location.hostname
    const isLocalDev = hostname === 'localhost' || hostname.startsWith('127.')
    const isAppDomain = hostname.startsWith('my.') || isLocalDev
    if (!isAppDomain) return

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setView('home')
    })
  }, [])

  if (view === 'landing') return <LandingPage />
  return <HomeClient />
}
