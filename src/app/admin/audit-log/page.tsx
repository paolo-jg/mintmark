import { getServiceDb } from '@/lib/admin'
import { Badge } from '@/components/ui/badge'

const ACTION_LABELS: Record<string, string> = {
  suspend_user: 'Suspend User',
  unsuspend_user: 'Unsuspend User',
  update_user: 'Update User',
  manual_release: 'Manual Payout Release',
  manual_refund: 'Manual Refund',
  resolve_dispute: 'Resolve Dispute',
  update_listing: 'Update Listing',
  update_platform: 'Update Platform',
}

const TARGET_COLORS: Record<string, string> = {
  user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  order: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  dispute: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  listing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  platform: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default async function AdminAuditLogPage() {
  const db = getServiceDb()

  const { data: actions } = await db
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const adminIds = [...new Set((actions ?? []).map(a => a.admin_id))]
  const { data: adminProfiles } = adminIds.length
    ? await db.auth.admin.listUsers()
    : { data: { users: [] } }

  const adminEmailMap: Record<string, string> = {}
  if (adminProfiles?.users) {
    for (const u of adminProfiles.users) {
      if (adminIds.includes(u.id)) adminEmailMap[u.id] = u.email ?? u.id
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Audit Log</h1>
        <p className="text-sm text-zinc-500 mt-1">All admin actions, most recent first.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {(actions ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500 px-5 py-8 text-center">No actions recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">When</th>
                <th className="text-left px-5 py-3">Admin</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Target</th>
                <th className="text-left px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {(actions ?? []).map(a => (
                <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-5 py-3 text-xs truncate max-w-[160px]">
                    {adminEmailMap[a.admin_id] ?? a.admin_id.slice(0, 8)}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium">{ACTION_LABELS[a.action] ?? a.action}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TARGET_COLORS[a.target_type] ?? ''}`}>
                      {a.target_type}
                    </span>
                    <span className="ml-2 font-mono text-xs text-zinc-400">{a.target_id?.slice(0, 8)}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400 max-w-[240px] truncate">
                    {a.metadata && Object.keys(a.metadata).length > 0
                      ? Object.entries(a.metadata as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(' · ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
