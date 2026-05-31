export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getServiceDb } from '@/lib/admin'
import { ImportClient } from './_components/import-client'

export const metadata = { title: 'Managed Import – Pedigree Coins' }

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isFirstImport = true

  if (user) {
    const db = getServiceDb()

    let dealerId = user.id
    const { data: profile } = await db
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_tier !== 'dealer') {
      const { data: teamMember } = await db
        .from('team_members')
        .select('dealer_id')
        .eq('user_id', user.id)
        .single()
      if (teamMember) dealerId = teamMember.dealer_id
    }

    const { data: priorCompleted } = await db
      .from('listing_import_requests')
      .select('id')
      .eq('dealer_id', dealerId)
      .eq('status', 'completed')
      .limit(1)

    isFirstImport = !priorCompleted || priorCompleted.length === 0
  }

  return (
    <Suspense>
      <ImportClient isFirstImport={isFirstImport} searchParams={params} />
    </Suspense>
  )
}
