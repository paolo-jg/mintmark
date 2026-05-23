import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CollectClient, type CollectionItem } from './_components/collect-client'
import { DevBanner } from '@/components/dev/dev-banner'

export const metadata = {
  title: 'My Collection — Pedigree Coins',
}

const IS_DEV = process.env.NODE_ENV === 'development'

export default async function CollectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !IS_DEV) redirect('/auth/login')

  const items = user
    ? (await supabase
        .from('collection_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      ).data
    : []

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">My Collection</h1>
        <p className="text-muted-foreground">
          Track the graded coins you own and the ones you&apos;re hunting for.
        </p>
      </div>

      <CollectClient initialItems={(items ?? []) as CollectionItem[]} />
      <DevBanner />
    </main>
  )
}
