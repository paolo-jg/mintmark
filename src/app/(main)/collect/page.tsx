import { createClient } from '@/lib/supabase/server'
import { CollectClient, type CollectionItem } from './_components/collect-client'
import { DevBanner } from '@/components/dev/dev-banner'

export const metadata = {
  title: 'My Collection — Pedigree Coins',
}

export default async function CollectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
        <h1 className="text-3xl font-bold tracking-tight">My Collection</h1>
      </div>

      <CollectClient initialItems={(items ?? []) as CollectionItem[]} isLoggedIn={!!user} />
      <DevBanner />
    </main>
  )
}
