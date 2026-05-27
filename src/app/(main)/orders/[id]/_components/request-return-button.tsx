'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const REASONS = [
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'other', label: 'Other' },
]

export default function RequestReturnButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason || !description.trim()) {
      toast.error('Please select a reason and describe the issue')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, reason, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit return')
      toast.success('Return request submitted')
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        Request a return
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border p-6">
            <h2 className="text-base font-bold mb-4">Request a Return</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">Reason</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a reason…</option>
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                  rows={4}
                  placeholder="Please describe the issue in detail…"
                  className="w-full text-sm px-3 py-2 border border-input rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Returns are reviewed by our team. You may be asked to ship the item back before a refund is issued.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 h-10 text-sm border border-input rounded-xl hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-10 text-sm bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                >
                  {loading ? 'Submitting…' : 'Submit Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
