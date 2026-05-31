'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface ImportRequest {
  id: string
  file_name: string
  file_content: string
  row_count: number
  notes: string | null
  status: string
  is_first_import: boolean
  amount_cents: number
  admin_notes: string | null
  created_at: string
  completed_at: string | null
  dealer: { email: string; display_name: string | null } | null
}

function statusClass(status: string) {
  switch (status) {
    case 'completed': return 'text-green-600 dark:text-green-400'
    case 'processing': return 'text-blue-600 dark:text-blue-400'
    case 'rejected': return 'text-destructive'
    case 'pending_payment': return 'text-orange-500'
    default: return 'text-muted-foreground'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Pending'
    case 'pending_payment': return 'Awaiting Payment'
    case 'processing': return 'Processing'
    case 'completed': return 'Completed'
    case 'rejected': return 'Rejected'
    default: return status
  }
}

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function ImportRow({ req, onUpdate }: { req: ImportRequest; onUpdate: () => void }) {
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '')
  const [loading, setLoading] = useState<string | null>(null)

  async function patch(status: 'processing' | 'completed' | 'rejected') {
    setLoading(status)
    try {
      await fetch(`/api/admin/imports/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes || undefined }),
      })
      onUpdate()
    } finally {
      setLoading(null)
    }
  }

  const canAct = req.status === 'pending' || req.status === 'processing'

  return (
    <tr className="border-b border-border hover:bg-muted/20 align-top">
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {new Date(req.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-xs">
        <p className="font-medium">{req.dealer?.display_name ?? req.dealer?.email ?? '—'}</p>
        <p className="text-muted-foreground">{req.dealer?.email}</p>
      </td>
      <td className="px-4 py-3 text-xs">{req.row_count}</td>
      <td className="px-4 py-3 text-xs">
        {req.is_first_import ? 'Free' : `$${(req.amount_cents / 100).toFixed(2)}`}
      </td>
      <td className={`px-4 py-3 text-xs font-medium ${statusClass(req.status)}`}>
        {statusLabel(req.status)}
      </td>
      <td className="px-4 py-3 text-xs max-w-[160px]">
        <p className="truncate text-muted-foreground">{req.notes ?? '—'}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2 min-w-[220px]">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadCsv(req.file_name, req.file_content)}
          >
            Download CSV
          </Button>
          {canAct && (
            <>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Admin notes (optional)"
                rows={2}
                className="text-xs rounded-md border border-border bg-background px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <div className="flex gap-1.5 flex-wrap">
                {req.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => patch('processing')}
                    disabled={loading !== null}
                  >
                    {loading === 'processing' ? 'Saving…' : 'Mark Processing'}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => patch('completed')}
                  disabled={loading !== null}
                >
                  {loading === 'completed' ? 'Saving…' : 'Mark Complete'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch('rejected')}
                  disabled={loading !== null}
                  className="text-destructive hover:text-destructive"
                >
                  {loading === 'rejected' ? 'Saving…' : 'Reject'}
                </Button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function AdminImportsPage() {
  const [requests, setRequests] = useState<ImportRequest[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/admin/imports')
      .then(r => r.json())
      .then(d => { if (d.requests) setRequests(d.requests) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage dealer listing import submissions.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No import requests yet.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Dealer</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Coins</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Cost</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Notes</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <ImportRow key={r.id} req={r} onUpdate={load} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
