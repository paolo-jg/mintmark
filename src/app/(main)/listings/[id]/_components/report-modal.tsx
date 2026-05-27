'use client'

import { useState } from 'react'
import { X, Loader2, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const REASONS: { value: string; label: string }[] = [
  { value: 'fraud',               label: 'Fraud' },
  { value: 'wrong_description',   label: 'Wrong description' },
  { value: 'counterfeit',         label: 'Counterfeit' },
  { value: 'price_manipulation',  label: 'Price manipulation' },
  { value: 'other',               label: 'Other' },
]

interface Props {
  listingId: string
  onClose: () => void
}

export function ReportModal({ listingId, onClose }: Props) {
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/listings/${listingId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to submit report')
        return
      }
      setDone(true)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-sm border border-border flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-bold">Report Listing</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="px-6 pb-6 text-center space-y-3">
            <p className="text-sm font-semibold">Report submitted</p>
            <p className="text-sm text-muted-foreground">
              Thank you for helping keep Pedigree Coins safe. We will review your report shortly.
            </p>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">Reason</Label>
              <select
                id="report-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select a reason…</option>
                {REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-details">
                Details <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="report-details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Add any additional context…"
                rows={3}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !reason}
              >
                {submitting
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Submitting…</>
                  : 'Submit Report'
                }
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
