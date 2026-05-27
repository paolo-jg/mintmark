'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/dialog'

const REASONS = [
  { value: 'item_not_received', label: 'Item Not Received' },
  { value: 'item_not_as_described', label: 'Item Not As Described' },
  { value: 'counterfeit', label: 'Counterfeit Coin' },
  { value: 'unauthorized_purchase', label: 'Unauthorized Purchase' },
  { value: 'other', label: 'Other' },
]

export default function FileDisputeButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!reason || !description.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to file dispute')
      toast.success('Dispute filed. Our team will review it shortly.')
      setOpen(false)
      window.location.reload()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-600 dark:text-red-400 underline underline-offset-2 hover:text-red-800 dark:hover:text-red-300"
      >
        File a dispute
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">File a Dispute</h2>
            <p className="text-sm text-zinc-500 mb-5">Our team will review your case and respond within 1-2 business days.</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">Reason</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                >
                  <option value="">Select a reason...</option>
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">Describe the issue</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Please describe what happened in detail..."
                  className="w-full text-sm px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-9 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || !reason || !description.trim()}
                className="flex-1 h-9 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Filing...' : 'File Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
