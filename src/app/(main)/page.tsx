export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from './_components/landing-page'
import { HomeClient } from './_components/home-client'

export default async function HomePage() {
  const hdrs = await headers()
  const host = hdrs.get('host') ?? ''
  const marketingHost = new URL(process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000').host

  // pedigreecoins.com always shows the marketing landing page — never app state
  if (host === marketingHost) {
    return <LandingPage />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <LandingPage />
  return <HomeClient />
}
