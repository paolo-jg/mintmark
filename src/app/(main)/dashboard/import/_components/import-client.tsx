'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import {
  Upload, FileText, AlertTriangle, CheckCircle2, X,
  Download, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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

interface RowError {
  row: number
  field: string
  message: string
}

type ParsedRow = Record<string, string>

type ImportState = 'idle' | 'parsed' | 'importing' | 'done'

// ── Field spec for the column reference table ─────────────────────────────────

const FIELD_SPEC = [
  { col: 'title',                req: true,  note: 'Listing title (max 200 chars)' },
  { col: 'listing_type',         req: true,  note: '"fixed" or "auction"' },
  { col: 'price',                req: false, note: 'Dollar amount. Required if fixed. e.g. 299.99' },
  { col: 'start_price',          req: false, note: 'Dollar amount. Required if auction.' },
  { col: 'reserve_price',        req: false, note: 'Auction reserve price (optional)' },
  { col: 'auction_bin_price',    req: false, note: 'Buy It Now price for auctions (optional)' },
  { col: 'listing_duration_days',req: false, note: 'Number of days, or "gtc" for Good Till Cancelled' },
  { col: 'description',          req: false, note: 'Listing description' },
  { col: 'coin_name',            req: false, note: 'e.g. "Morgan Dollar"' },
  { col: 'year',                 req: false, note: '4-digit year' },
  { col: 'mint_mark',            req: false, note: 'P, S, D, CC, O, etc.' },
  { col: 'denomination',         req: false, note: 'e.g. "$1", "25C", "10C"' },
  { col: 'grading_service',      req: false, note: 'PCGS, NGC, ANACS, ICG, SEGS, or Ungraded' },
  { col: 'grade',                req: false, note: 'e.g. MS65, VF20, PR70' },
  { col: 'cert_number',          req: false, note: 'Certification number' },
  { col: 'cac_designation',      req: false, note: 'true or false' },
  { col: 'pass_convenience_fee', req: false, note: 'true or false' },
  { col: 'accept_offers',        req: false, note: 'true or false' },
  { col: 'min_offer_amount',     req: false, note: 'Minimum offer in dollars' },
  { col: 'returns_accepted',     req: false, note: 'true or false' },
  { col: 'returns_policy_type',  req: false, note: '"standard" or "custom"' },
  { col: 'returns_policy_days',  req: false, note: 'Return window in days (e.g. 14)' },
  { col: 'returns_policy_custom',req: false, note: 'Custom return policy text' },
]

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
        <p className="text-xs text-muted-foreground mt-1">CSV files only · Max 500 rows</p>
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

// ── Error table ────────────────────────────────────────────────────────────────

function ErrorTable({ errors }: { errors: RowError[] }) {
  const [expanded, setExpanded] = useState(true)
  const shown = expanded ? errors : errors.slice(0, 5)

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {errors.length} validation error{errors.length !== 1 ? 's' : ''} — fix these before importing
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="border-t border-destructive/20 divide-y divide-destructive/10">
        {shown.map((e, i) => (
          <div key={i} className="px-4 py-2.5 grid grid-cols-[4rem_1fr_auto] gap-3 text-xs items-start">
            <span className="text-muted-foreground font-mono">Row {e.row}</span>
            <span className="font-medium text-foreground">{e.message}</span>
            <span className="text-muted-foreground font-mono">{e.field}</span>
          </div>
        ))}
      </div>
      {errors.length > 5 && (
        <div className="px-4 py-2 border-t border-destructive/20">
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {expanded ? 'Show fewer' : `Show all ${errors.length} errors`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Preview table ─────────────────────────────────────────────────────────────

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? rows : rows.slice(0, 5)
  const cols = ['title', 'listing_type', 'price', 'start_price', 'coin_name', 'year', 'grading_service', 'grade']

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-8">#</th>
              {cols.map(c => (
                <th key={c} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="px-3 py-2 text-muted-foreground font-mono">{i + 1}</td>
                {cols.map(c => (
                  <td key={c} className="px-3 py-2 max-w-[180px] truncate">{row[c] || '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 5 && (
        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'Show fewer rows' : `+ ${rows.length - 5} more rows`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Column reference ──────────────────────────────────────────────────────────

function ColumnReference() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        Column reference
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Column</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Required</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FIELD_SPEC.map(f => (
                <tr key={f.col}>
                  <td className="px-3 py-2 font-mono">{f.col}</td>
                  <td className="px-3 py-2">{f.req ? <span className="text-destructive font-semibold">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ImportClient() {
  const router = useRouter()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<RowError[]>([])
  const [state, setState] = useState<ImportState>('idle')
  const [importedCount, setImportedCount] = useState(0)

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }

    setParseErrors([])
    setValidationErrors([])
    setRows([])

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setParseErrors(result.errors.map(e => e.message))
          return
        }
        if (result.data.length === 0) {
          setParseErrors(['The CSV file appears to be empty.'])
          return
        }
        if (result.data.length > 500) {
          setParseErrors(['Maximum 500 rows per import. Please split your file.'])
          return
        }
        setFileName(file.name)
        setRows(result.data)
        setState('parsed')
      },
      error: (err) => {
        setParseErrors([err.message])
      },
    })
  }

  function handleClear() {
    setFileName(null)
    setRows([])
    setParseErrors([])
    setValidationErrors([])
    setState('idle')
  }

  async function handleImport() {
    setState('importing')
    setValidationErrors([])
    try {
      const res = await fetch('/api/listings/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const json = await res.json()

      if (res.status === 422 && json.errors?.length) {
        setValidationErrors(json.errors)
        setState('parsed')
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Import failed')

      setImportedCount(json.imported)
      setState('done')
      toast.success(`${json.imported} listing${json.imported !== 1 ? 's' : ''} created as drafts`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
      setState('parsed')
    }
  }

  // ── Done state ───────────────────────────────────────────────────────────────

  if (state === 'done') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Import complete</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>{importedCount}</strong> listing{importedCount !== 1 ? 's' : ''} created as drafts.
              Add images to each one and publish when ready.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button render={<Link href="/sell?tab=draft" />}>
              Go to Drafts
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Import Another File
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Import</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create up to 500 listings from a CSV. Listings are created as drafts — add images and publish each one manually.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Template CSV
        </Button>
      </div>

      {/* Drop zone or file info */}
      {state === 'idle' ? (
        <DropZone onFile={handleFile} />
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">{rows.length} row{rows.length !== 1 ? 's' : ''} detected</p>
          </div>
          <button
            onClick={handleClear}
            className="text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Parse errors */}
      {parseErrors.length > 0 && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3.5 space-y-1">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Could not parse file
          </p>
          {parseErrors.map((e, i) => (
            <p key={i} className="text-xs text-destructive/80 pl-6">{e}</p>
          ))}
        </div>
      )}

      {/* Validation errors from server */}
      {validationErrors.length > 0 && <ErrorTable errors={validationErrors} />}

      {/* Preview */}
      {rows.length > 0 && <PreviewTable rows={rows} />}

      {/* Import button */}
      {state === 'parsed' && rows.length > 0 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Ready to import <strong>{rows.length}</strong> listing{rows.length !== 1 ? 's' : ''} as drafts.
          </p>
          <Button onClick={handleImport}>
            {`Import ${rows.length} Listing${rows.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}

      {/* Column reference */}
      <ColumnReference />
    </div>
  )
}
