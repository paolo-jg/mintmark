import { CollectClient } from './_components/collect-client'
import { DevBanner } from '@/components/dev/dev-banner'

export const metadata = {
  title: 'My Collection — Pedigree Coins',
}

export default function CollectPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Collection</h1>
      </div>

      <CollectClient initialItems={[]} isLoggedIn={true} />
      <DevBanner />
    </main>
  )
}
