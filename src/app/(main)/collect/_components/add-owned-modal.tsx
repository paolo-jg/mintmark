'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const GRADED_SERVICES = ['PCGS', 'NGC', 'ANACS', 'ICG', 'SEGS']

export function AddOwnedModal({ onClose, onAdded }: Props) {
  const [service, setService] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [looking, setLooking] = useState(false)
  const [coinData, setCoinData] = useState<Record<string, unknown> | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const lookup = async () => {
    if (!certNumber.trim()) return
    setLooking(true)
    setCoinData(null)
    try {
      const res = await fetch(`/api/cert-lookup?service=${service}&certNumber=${certNumber.trim()}`)
      const json = await res.json()
      if (json.success && json.data) {
        setCoinData(json.data)
      } else {
        toast.error(json.error ?? 'Cert not found')
      }
    } catch {
      toast.error('Failed to reach grading service')
    } finally {
      setLooking(false)
    }
  }

  const isUngraded = !service
  const canSave = isUngraded ? !!certNumber.trim() || true : !!coinData
  // ungraded: can save immediately; graded: need cert lookup result

  const save = async () => {
    if (!isUngraded && !coinData) return
    setSaving(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'owned',
          coin_name: (coinData?.coinName ?? certNumber) || null,
          year: coinData?.year ?? null,
          mint_mark: coinData?.mintMark ?? null,
          denomination: coinData?.denomination ?? null,
          cert_number: certNumber.trim() || null,
          grading_service: service || null,
          grade: coinData?.grade ?? null,
          pcgs_image_url: coinData?.pcgsImageUrl ?? null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      toast.success('Added to your collection')
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-md border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Add Owned Coin</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Grading service */}
          <div className="space-y-1.5">
            <Label>Grading Service <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={service} onValueChange={v => { setService(v ?? ''); setCoinData(null) }}>
              <SelectTrigger><SelectValue placeholder="Ungraded" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Ungraded</SelectItem>
                {GRADED_SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cert lookup - only when a grading service is selected */}
          {service && (
            <div className="space-y-1.5">
              <Label>Cert Number</Label>
              <div className="flex gap-2">
                <Input
                  value={certNumber}
                  onChange={e => setCertNumber(e.target.value)}
                  placeholder="12345678"
                  onKeyDown={e => e.key === 'Enter' && lookup()}
                />
                <Button type="button" variant="outline" onClick={lookup} disabled={looking || !certNumber.trim()}>
                  {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Look up'}
                </Button>
              </div>
            </div>
          )}

          {/* Coin result */}
          {coinData && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                {coinData.verificationStatus === 'verified'
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 text-amber-500" />
                }
                <span className="text-sm font-medium">{String(coinData.coinName ?? '')}</span>
              </div>
              {!!coinData.pcgsImageUrl && (
                <img
                  src={String(coinData.pcgsImageUrl)}
                  alt=""
                  className="w-24 h-24 object-contain mix-blend-multiply mx-auto"
                />
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {!!coinData.grade && <div><span className="text-muted-foreground">Grade: </span>{String(coinData.grade)}</div>}
                {!!coinData.year && <div><span className="text-muted-foreground">Year: </span>{String(coinData.year)}</div>}
                {!!coinData.mintMark && <div><span className="text-muted-foreground">Mint: </span>{String(coinData.mintMark)}</div>}
                {coinData.populationAtGrade !== undefined && (
                  <div><span className="text-muted-foreground">Pop: </span>{String(coinData.populationAtGrade)}</div>
                )}
              </div>
            </div>
          )}

          {/* Notes - always visible */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bought at Heritage 2024, original roll"
            />
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || (!!service && !coinData)}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Add to Collection
          </Button>
        </div>
      </div>
    </div>
  )
}
