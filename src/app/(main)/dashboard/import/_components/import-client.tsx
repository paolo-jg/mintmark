'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Upload, FileText, CheckCircle2, X, Download, Loader2 } from 'lucide-react'

// ── CSV template ───────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'title', 'listing_type', 'price', 'start_price', 'reserve_price',
  'auction_bin_price', 'listing_duration_days', 'description',
  'coin_name', 'year', 'mint_mark', 'denomination',
  'grading_service', 'grade', 'cert_number', 'cac_designation',
  'pass_convenience_fee', 'accept_offers', 'min_offer_amount',
  'returns_accepted', 'returns_policy_type', 'returns_policy_days',
  'returns_policy_custom',
]

const TEMPLATE_EXAMPLE_ROWS = [
  [
    '1893-S Morgan Dollar PCGS MS64', 'fixed', '18500', '', '', '',
    'gtc', 'Problem-free original skin. CAC approved.',
    'Morgan Dollar', '1893', 'S', '$1',
    'PCGS', 'MS64', '12345678', 'true',
    'false', 'true', '15000',
    'true', 'standard', '14', '',
  ],
  [
    '1804 Bust Dollar NGC AU50 Auction', 'auction', '', '95000', '120000', '150000',
    '7', 'Incredible eye appeal. Original surfaces.',
    'Bust Dollar', '1804', '', '$1',
    'NGC', 'AU50', '87654321', 'false',
    'false', 'false', '',
    'false', '', '', '',
  ],
]

function downloadTemplate() {
  const csv = Papa.unparse({ fields: TEMPLATE_HEADERS, data: TEMPLATE_EXAMPLE_ROWS })
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pedigree-coins-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ImportState = 'idle' | 'parsed' | 'submitting' | 'done'

interface ImportRequest {
  id: string
  file_name: string
  row_count: number
  amount_cents: number
  status: string
  is_first_import: boolean
  created_at: string
  completed_at: string | null
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-14 px-6 text-center gap-3 ${
        dragging ? 'border-foreground/40 bg-muted/60' : 'border-border hover:border-foreground/20 hover:bg-muted/20'
      }`}
    >
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        <Upload className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold">Drop your CSV here, or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
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

function statusClass(status: string) {
  switch (status) {
    case 'completed': return 'text-green-600 dark:text-green-400'
    case 'processing': return 'text-blue-600 dark:text-blue-400'
    case 'rejected': return 'text-destructive'
    case 'pending_payment': return 'text-orange-500'
    default: return 'text-muted-foreground'
  }
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ImportClient({ isFirstImport, searchParams }: { isFirstImport: boolean; searchParams?: { paid?: string } }) {
  const paid = searchParams?.paid === 'true'

  const [fileName, setFileName] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [parseError, setParseError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<ImportState>('idle')
  const [pastRequests, setPastRequests] = useState<ImportRequest[]>([])

  useEffect(() => {
    fetch('/api/listings/import-request')
      .then(r => r.json())
      .then(d => { if (d.requests) setPastRequests(d.requests) })
      .catch(() => null)
  }, [state])

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please upload a CSV file')
      return
    }
    setParseError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length === 0) {
            setParseError('The CSV file appears to be empty.')
            return
          }
          setFileName(file.name)
          setFileContent(text)
          setRowCount(result.data.length)
          setState('parsed')
        },
        error: (err: { message: string }) => setParseError(err.message),
      })
    }
    reader.readAsText(file)
  }

  function handleClear() {
    setFileName(null)
    setFileContent(null)
    setRowCount(0)
    setParseError(null)
    setNotes('')
    setState('idle')
  }

  async function handleSubmit() {
    if (!fileContent || !fileName) return
    setState('submitting')
    try {
      const res = await fetch('/api/listings/import-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: fileName, file_content: fileContent, row_count: rowCount, notes: notes || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')

      if (json.isFree) {
        setState('done')
      } else if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Submission failed')
      setState('parsed')
    }
  }

  const costEstimate = isFirstImport ? 'FREE' : `$${(rowCount * 0.5).toFixed(2)}`

  if (state === 'done') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Request submitted!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We'll have your listings ready within 1–2 business days.
            </p>
          </div>
          <Button variant="outline" onClick={handleClear}>Submit Another File</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {paid && (
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300 font-medium">
            Payment received! We'll have your listings ready within 1–2 business days.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Managed Listing Import</h1>
          <p className="text-sm text-muted-foreground mt-1">We create your listings for you.</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download Template CSV
        </Button>
      </div>

      <div className="inline-flex items-center gap-2">
        {isFirstImport ? (
          <span className="rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold px-3 py-1">
            First import: FREE
          </span>
        ) : (
          <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-3 py-1">
            Pricing: $0.50 per listing
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">How it works</p>
        <ol className="space-y-2">
          {[
            'Download the template CSV above',
            'Fill in your coin data - one row per coin',
            'Upload here with any notes',
            "We'll create all your listings within 1–2 business days",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {state === 'idle' || state === 'parsed' ? (
        <>
          {state === 'idle' ? (
            <DropZone onFile={handleFile} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{rowCount} row{rowCount !== 1 ? 's' : ''} detected</p>
              </div>
              <button onClick={handleClear} className="text-muted-foreground/60 hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {parseError && (
            <p className="text-sm text-destructive">{parseError}</p>
          )}

          {state === 'parsed' && (
            <>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special instructions? (optional)"
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />

              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{rowCount}</strong> coin{rowCount !== 1 ? 's' : ''} · estimated cost: <strong>{costEstimate}</strong>
                </p>
                <Button onClick={handleSubmit}>
                  {isFirstImport ? `Submit ${rowCount} Listings (Free)` : `Pay & Submit - ${costEstimate}`}
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Submitting…</span>
        </div>
      )}

      {pastRequests.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Past requests</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Date</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">File</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Coins</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Cost</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pastRequests.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-[180px] truncate">{r.file_name}</td>
                    <td className="px-4 py-2.5 text-xs">{r.row_count}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.is_first_import ? 'Free' : `$${(r.amount_cents / 100).toFixed(2)}`}
                    </td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${statusClass(r.status)}`}>
                      {statusLabel(r.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
