'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LandingPage } from './landing-page'
import { HomeClient, DashboardSkeleton } from './home-client'

export function HomeShell() {
  const [view, setView] = useState<'loading' | 'landing' | 'home'>('loading')

  useEffect(() => {
    const hostname = window.location.hostname
    const isLocalDev = hostname === 'localhost' || hostname.startsWith('127.')
    const isAppDomain = hostname.startsWith('my.') || isLocalDev

    if (!isAppDomain) {
      setView('landing')
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setView(session ? 'home' : 'landing')
    })
  }, [])

  if (view === 'loading') return <DashboardSkeleton />
  if (view === 'landing') return <LandingPage />
  return <HomeClient />
}
