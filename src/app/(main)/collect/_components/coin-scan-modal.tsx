'use client'

import { useState, useCallback, useRef } from 'react'
import { X, Upload, Loader2, Check, AlertCircle, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  onAdded: () => void
}

type Step = 'upload' | 'scanning' | 'review' | 'saving'

interface ScanResult {
  series_slug: string | null
  coin_name: string | null
  year: number | null
  mint_mark: string | null
  denomination: string | null
  grade: string | null
  grading_service: string | null
  cert_number: string | null
  variety: string | null
  confidence: 'high' | 'medium' | 'low'
  notes: string | null
}

interface ImageState {
  file: File
  preview: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const ACCEPT_LABEL = 'JPEG, PNG, WEBP or GIF'

function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(reader.result as string)
    reader.onerror = rej
    reader.readAsDataURL(file)
  })
}

const CONFIDENCE_CONFIG = {
  high:   { label: 'High confidence',   color: 'text-emerald-600', dot: 'bg-emerald-500' },
  medium: { label: 'Medium confidence', color: 'text-amber-600',   dot: 'bg-amber-500'   },
  low:    { label: 'Low confidence',    color: 'text-red-600',     dot: 'bg-red-500'      },
}

// ── Image dropzone ────────────────────────────────────────────────────────────

function ImageDropzone({
  stepNum, label, sub, image, onFile, onClear, locked,
}: {
  stepNum: number
  label: string
  sub: string
  image: ImageState | null
  onFile: (f: File) => void
  onClear: () => void
  locked?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (locked) return
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }, [onFile, locked])

  return (
    <div className={`space-y-2 transition-opacity ${locked ? 'opacity-40 pointer-events-none select-none' : ''}`}>
      <div className="flex items-center gap-2">
        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${image ? 'bg-foreground text-background' : 'bg-muted border border-border text-muted-foreground'}`}>
          {image ? <Check className="h-3 w-3" /> : stepNum}
        </div>
        <p className="text-[12px] font-semibold text-foreground">{label}</p>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>

      {image ? (
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20 aspect-video">
          <img src={image.preview} alt={label} className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            <p className="text-[11px] font-semibold text-white">{label} uploaded</p>
          </div>
          <button
            onClick={onClear}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl border-2 border-dashed border-border aspect-video flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-foreground/40 hover:bg-muted/30 transition-colors"
        >
          <Upload className="h-5 w-5 text-muted-foreground/40" />
          <p className="text-[13px] font-medium text-foreground">Click to upload or drag and drop</p>
          <p className="text-[11px] text-muted-foreground/50">{ACCEPT_LABEL}</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
          />
        </div>
      )}
    </div>
  )
}

// ── Editable field ────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, mono }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
      <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={mono ? 'font-mono text-sm' : 'text-sm'} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoinScanModal({ onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [obverse, setObverse] = useState<ImageState | null>(null)
  const [reverse, setReverse] = useState<ImageState | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const [coinName, setCoinName] = useState('')
  const [year, setYear] = useState('')
  const [mintMark, setMintMark] = useState('')
  const [denomination, setDenomination] = useState('')
  const [grade, setGrade] = useState('')
  const [gradingService, setGradingService] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [notes, setNotes] = useState('')

  const handleObverseFile = (f: File) => {
    if (obverse) URL.revokeObjectURL(obverse.preview)
    setObverse({ file: f, preview: URL.createObjectURL(f) })
  }
  const handleReverseFile = (f: File) => {
    if (reverse) URL.revokeObjectURL(reverse.preview)
    setReverse({ file: f, preview: URL.createObjectURL(f) })
  }
  const clearObverse = () => { if (obverse) URL.revokeObjectURL(obverse.preview); setObverse(null) }
  const clearReverse = () => { if (reverse) URL.revokeObjectURL(reverse.preview); setReverse(null) }

  const scan = async () => {
    if (!obverse || !reverse) return
    setStep('scanning')
    setScanError(null)
    try {
      const [obvB64, revB64] = await Promise.all([toBase64(obverse.file), toBase64(reverse.file)])
      const res = await fetch('/api/coin-identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obverse: obvB64, reverse: revB64 }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error ?? 'Scan failed')
      const data: ScanResult = json.data
      setScanResult(data)
      setCoinName(data.coin_name ?? '')
      setYear(data.year ? String(data.year) : '')
      setMintMark(data.mint_mark ?? '')
      setDenomination(data.denomination ?? '')
      setGrade(data.grade ?? '')
      setGradingService(data.grading_service ?? '')
      setCertNumber(data.cert_number ?? '')
      setNotes('')
      setStep('review')
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Identification failed')
      setStep('upload')
    }
  }

  const save = async () => {
    if (!coinName.trim()) { toast.error('Coin name is required'); return }
    setStep('saving')
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'owned',
          coin_name: coinName.trim(),
          year: year ? parseInt(year) : null,
          mint_mark: mintMark.trim() || null,
          denomination: denomination.trim() || null,
          grade: grade.trim() || null,
          grading_service: gradingService.trim() || null,
          cert_number: certNumber.trim() || null,
          series_slug: scanResult?.series_slug ?? null,
          notes: notes.trim() || null,
          user_images: await Promise.all([toBase64(obverse!.file), toBase64(reverse!.file)]),
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('Coin added to your collection')
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
      setStep('review')
    }
  }

  const resetScan = () => { setScanResult(null); setScanError(null); setStep('upload') }
  const canScan = !!obverse && !!reverse

  const isUpload = step === 'upload' || step === 'scanning'
  const isReview = step === 'review' || step === 'saving'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-4xl border border-border flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-0.5">AI Identification</p>
            <h2 className="text-lg font-bold leading-tight">
              {isUpload && 'Scan Your Coin'}
              {isReview && 'Review Results'}
            </h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left column: images ── */}
          <div className="w-1/2 flex-shrink-0 border-r border-border overflow-y-auto overscroll-none px-8 py-6 space-y-5">

            {step === 'upload' && (
              <>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  AI results are not always 100% accurate. Review everything carefully before saving. If identification fails, add the coin manually instead.
                </p>
                <ImageDropzone stepNum={1} label="Obverse" sub="(front)" image={obverse} onFile={handleObverseFile} onClear={clearObverse} />
                <ImageDropzone stepNum={2} label="Reverse" sub="(back)" image={reverse} onFile={handleReverseFile} onClear={clearReverse} locked={!obverse} />
                {scanError && (
                  <div className="flex gap-2 text-[12px] text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-px" />
                    <span>{scanError}</span>
                  </div>
                )}
              </>
            )}

            {step === 'scanning' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-full border-2 border-border" />
                  <Loader2 className="h-14 w-14 animate-spin text-foreground absolute inset-0" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Identifying your coin...</p>
                  <p className="text-[12px] text-muted-foreground mt-1">This usually takes 5 to 10 seconds</p>
                </div>
              </div>
            )}

            {isReview && (
              <>
                {/* Thumbnails */}
                <div className="grid grid-cols-2 gap-3">
                  {obverse && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Obverse</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-muted/20 aspect-video">
                        <img src={obverse.preview} alt="Obverse" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                  {reverse && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Reverse</p>
                      <div className="rounded-xl overflow-hidden border border-border bg-muted/20 aspect-video">
                        <img src={reverse.preview} alt="Reverse" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confidence */}
                {scanResult && (() => {
                  const cfg = CONFIDENCE_CONFIG[scanResult.confidence] ?? CONFIDENCE_CONFIG.medium
                  return (
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <p className={`text-[12px] font-semibold ${cfg.color}`}>{cfg.label}</p>
                      {scanResult.confidence !== 'high' && (
                        <p className="text-[12px] text-muted-foreground">review carefully</p>
                      )}
                    </div>
                  )
                })()}

                {/* AI observation */}
                {scanResult?.notes && (
                  <p className="text-[12px] text-muted-foreground italic leading-relaxed">{scanResult.notes}</p>
                )}

                {/* Rescan */}
                <button
                  onClick={resetScan}
                  className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Rescan with different photos
                </button>
              </>
            )}
          </div>

          {/* ── Right column: tips / fields ── */}
          <div className="flex-1 overflow-y-auto overscroll-none px-8 py-6 flex flex-col">

            {/* Upload state: tips */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">Tips for best results</p>
                  <div className="space-y-3">
                    {[
                      { title: 'Good lighting', body: 'Natural light or a desk lamp at a 45 degree angle works best.' },
                      { title: 'Fill the frame', body: 'Get close so the coin fills most of the image. Avoid wide shots.' },
                      { title: 'Slabs', body: 'Make sure the full label is visible and legible so the grade and cert number can be read.' },
                      { title: 'Sharp focus', body: 'Avoid blurry or heavily shadowed images. Tap to focus if using a phone.' },
                    ].map(tip => (
                      <div key={tip.title}>
                        <p className="text-[12px] font-semibold text-foreground">{tip.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{tip.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scanning state: just a placeholder */}
            {step === 'scanning' && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px] text-muted-foreground">Analyzing both images...</p>
              </div>
            )}

            {/* Review state: editable fields */}
            {isReview && (
              <div className="space-y-4 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">Coin details</p>
                <p className="text-[12px] text-muted-foreground">Review and correct the fields below before saving.</p>
                <Field label="Coin name *" value={coinName} onChange={setCoinName} placeholder="e.g. Lincoln Wheat Cent" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Year" value={year} onChange={setYear} placeholder="e.g. 1955" mono />
                  <Field label="Mint mark" value={mintMark} onChange={setMintMark} placeholder="S, D, CC..." mono />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Grade" value={grade} onChange={setGrade} placeholder="e.g. MS65" mono />
                  <Field label="Grading service" value={gradingService} onChange={setGradingService} placeholder="PCGS, NGC..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cert number" value={certNumber} onChange={setCertNumber} placeholder="12345678" mono />
                  <Field label="Denomination" value={denomination} onChange={setDenomination} placeholder="1C, 25C, $1..." mono />
                </div>
                <Field label="Notes (optional)" value={notes} onChange={setNotes} placeholder="e.g. Bought at Heritage 2024" />
              </div>
            )}

            {/* Footer action - pinned to bottom of right column */}
            <div className="pt-6 mt-auto">
              {step === 'upload' && (
                <Button onClick={scan} disabled={!canScan} className="w-full" size="lg">
                  {canScan ? 'Identify Coin with AI' : 'Upload both sides to continue'}
                </Button>
              )}
              {step === 'review' && (
                <Button onClick={save} disabled={!coinName.trim()} className="w-full" size="lg">
                  <Check className="h-4 w-4 mr-2" />
                  Add to Collection
                </Button>
              )}
              {step === 'saving' && (
                <Button disabled className="w-full" size="lg">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
