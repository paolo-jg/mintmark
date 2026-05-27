'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved_buyer', label: 'Resolved — Buyer Wins', description: 'Order reverts to delivered, no payout.' },
  { value: 'resolved_seller', label: 'Resolved — Seller Wins', description: 'Payout released to seller.' },
  { value: 'closed', label: 'Closed', description: 'Close without resolution.' },
]

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  resolved_buyer: 'bg-green-100 text-green-800',
  resolved_seller: 'bg-blue-100 text-blue-800',
  closed: 'bg-zinc-100 text-zinc-700',
}

export default function DisputeResolveForm({ dispute }: { dispute: any }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>(dispute.status)
  const [notes, setNotes] = useState<string>(dispute.admin_notes ?? '')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/disputes/${dispute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes }),
      })
      if (!res.ok) throw new Error()
      toast.success('Dispute updated')
      router.refresh()
    } catch {
      toast.error('Failed to update dispute')
    } finally {
      setLoading(false)
    }
  }

  const current = STATUS_OPTIONS.find(s => s.value === status)

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sticky top-8">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Resolution</h2>

      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-1.5">Current status</p>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[dispute.status]}`}>
          {dispute.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs text-zinc-500 mb-1.5">Update status</p>
        {STATUS_OPTIONS.map(opt => (
          <label key={opt.value} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
            status === opt.value
              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
              : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700'
          }`}>
            <input
              type="radio"
              name="status"
              value={opt.value}
              checked={status === opt.value}
              onChange={() => setStatus(opt.value)}
              className="mt-0.5 accent-zinc-900 dark:accent-zinc-100"
            />
            <div>
              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{opt.label}</p>
              {opt.description && <p className="text-xs text-zinc-400 mt-0.5">{opt.description}</p>}
            </div>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <label className="text-xs text-zinc-500 block mb-1.5">Admin notes (internal)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add internal notes about this dispute..."
          rows={4}
          className="w-full text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
        />
      </div>

      <button
        onClick={save}
        disabled={loading}
        className="w-full h-9 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
    </div>
  )
}
