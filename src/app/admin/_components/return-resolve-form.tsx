'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'approved', label: 'Approved', description: 'Return approved, awaiting label/shipment.' },
  { value: 'label_sent', label: 'Label Sent', description: 'Shipping label sent to buyer.' },
  { value: 'received', label: 'Item Received', description: 'Item received back from buyer.' },
  { value: 'refunded', label: 'Refunded', description: 'Refund issued to buyer.' },
  { value: 'rejected', label: 'Rejected', description: 'Return request denied.' },
  { value: 'closed', label: 'Closed', description: 'Closed without refund.' },
]

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-100 text-red-800',
  approved: 'bg-blue-100 text-blue-800',
  label_sent: 'bg-sky-100 text-sky-800',
  received: 'bg-yellow-100 text-yellow-800',
  refunded: 'bg-green-100 text-green-800',
  rejected: 'bg-orange-100 text-orange-800',
  closed: 'bg-zinc-100 text-zinc-700',
}

export default function ReturnResolveForm({ ret, orderAmountCents }: { ret: any; orderAmountCents: number }) {
  const router = useRouter()
  const [status, setStatus] = useState<string>(ret.status)
  const [notes, setNotes] = useState<string>(ret.admin_notes ?? '')
  const [refundAmount, setRefundAmount] = useState<string>(
    ret.refund_amount_cents ? (ret.refund_amount_cents / 100).toFixed(2) : ''
  )
  const [loading, setLoading] = useState(false)
  const [refunding, setRefunding] = useState(false)

  async function save() {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { status, admin_notes: notes }
      if (refundAmount) {
        const cents = Math.round(parseFloat(refundAmount) * 100)
        if (!isNaN(cents) && cents > 0) body.refund_amount_cents = cents
      }
      const res = await fetch(`/api/admin/returns/${ret.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success('Return updated')
      router.refresh()
    } catch {
      toast.error('Failed to update return')
    } finally {
      setLoading(false)
    }
  }

  async function issueRefund() {
    const cents = Math.round(parseFloat(refundAmount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid refund amount')
      return
    }
    if (cents > orderAmountCents) {
      toast.error('Refund cannot exceed order amount')
      return
    }
    setRefunding(true)
    try {
      const res = await fetch(`/api/admin/returns/${ret.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refund_amount_cents: cents, issue_refund: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Refund failed')
      toast.success('Refund issued via Stripe')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Refund failed')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sticky top-8">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Resolution</h2>

      <div className="mb-4">
        <p className="text-xs text-zinc-500 mb-1.5">Current status</p>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[ret.status] ?? 'bg-zinc-100 text-zinc-700'}`}>
          {ret.status.replace(/_/g, ' ')}
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
        <label className="text-xs text-zinc-500 block mb-1.5">Refund amount (USD)</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={refundAmount}
            onChange={e => setRefundAmount(e.target.value)}
            placeholder={(orderAmountCents / 100).toFixed(2)}
            className="flex-1 text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <p className="text-[11px] text-zinc-400 mt-1">Order total: ${(orderAmountCents / 100).toFixed(2)}</p>
      </div>

      <div className="mb-4">
        <label className="text-xs text-zinc-500 block mb-1.5">Admin notes (internal)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add internal notes about this return..."
          rows={3}
          className="w-full text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600"
        />
      </div>

      <div className="space-y-2">
        <button
          onClick={save}
          disabled={loading}
          className="w-full h-9 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={issueRefund}
          disabled={refunding || !refundAmount}
          className="w-full h-9 text-sm font-medium border border-green-600 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-40"
        >
          {refunding ? 'Processing...' : 'Issue Stripe Refund'}
        </button>
      </div>
    </div>
  )
}
