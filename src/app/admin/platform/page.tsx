export const dynamic = 'force-dynamic'

import { getServiceDb } from '@/lib/admin'
import PlatformControls from '../_components/platform-controls'

export default async function AdminPlatformPage() {
  const db = getServiceDb()
  const { data } = await db.from('platform_settings').select('*')

  const settings: Record<string, unknown> = {}
  for (const row of data ?? []) settings[row.key] = row.value

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Platform Controls</h1>
        <p className="text-sm text-zinc-500 mt-1">Global switches and settings for the entire platform.</p>
      </div>
      <PlatformControls initialSettings={settings} />
    </div>
  )
}
