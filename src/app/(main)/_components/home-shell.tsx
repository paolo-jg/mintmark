'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LandingPage } from './landing-page'
import { HomeClient } from './home-client'

export function HomeShell() {
  const [view, setView] = useState<'loading' | 'landing' | 'home'>('loading')

  useEffect(() => {
    const marketingHostname = process.env.NEXT_PUBLIC_MARKETING_URL
      ? new URL(process.env.NEXT_PUBLIC_MARKETING_URL).hostname
      : 'pedigreecoins.com'

    if (window.location.hostname === marketingHostname) {
      setView('landing')
      return
    }

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setView(session ? 'home' : 'landing')
    })
  }, [])

  if (view === 'loading') return null
  if (view === 'landing') return <LandingPage />
  return <HomeClient />
}
