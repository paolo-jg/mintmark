'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { CollectionItem } from './collect-client'

interface Props {
  item: CollectionItem
  onClose: () => void
  onSaved: (updated: CollectionItem) => void
}

const GRADING_SERVICES = [
  { value: '', label: 'Any' },
  { value: 'PCGS', label: 'PCGS' },
  { value: 'NGC', label: 'NGC' },
  { value: 'ANACS', label: 'ANACS' },
  { value: 'ICG', label: 'ICG' },
  { value: 'SEGS', label: 'SEGS' },
]

const GRADE_GROUPS = [
  { label: 'Proof', grades: ['PR70', 'PR69', 'PR68', 'PR67', 'PR66', 'PR65', 'PR64', 'PR63', 'PR60'] },
  { label: 'Mint State', grades: ['MS70', 'MS69', 'MS68', 'MS67', 'MS66', 'MS65', 'MS64', 'MS63', 'MS62', 'MS61', 'MS60'] },
  { label: 'About Uncirculated', grades: ['AU58', 'AU55', 'AU53', 'AU50'] },
  { label: 'Extremely Fine', grades: ['EF45', 'EF40'] },
  { label: 'Very Fine', grades: ['VF35', 'VF30', 'VF25', 'VF20'] },
  { label: 'Fine', grades: ['F15', 'F12'] },
  { label: 'Very Good', grades: ['VG10', 'VG8'] },
  { label: 'Good', grades: ['G6', 'G4'] },
  { label: 'Low Grade', grades: ['AG3', 'FR2', 'PO1'] },
]

export function WishlistEditModal({ item, onClose, onSaved }: Props) {
  const [service, setService] = useState(item.grading_service ?? '')
  const [grade, setGrade] = useState(item.grade ?? '')
  const [maxPrice, setMaxPrice] = useState(item.max_price ? String(item.max_price / 100) : '')
  const [notes, setNotes] = useState(item.notes ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/collection', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          grading_service: service || null,
          grade: grade || null,
          max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
          notes: notes.trim() || null,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      onSaved({
        ...item,
        grading_service: service || null,
        grade: grade || null,
        max_price: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
        notes: notes.trim() || null,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-background rounded-3xl shadow-2xl w-full max-w-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Edit Wish List Item</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{item.coin_name}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-5">

          {/* Grading Service */}
          <div className="space-y-1.5">
            <Label>Grading Service</Label>
            <Select value={service} onValueChange={v => setService(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                {GRADING_SERVICES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grade — chip picker */}
          <div className="space-y-3">
            <Label>Grade</Label>

            {/* Ungraded chip */}
            <div className="pb-2 border-b border-border">
              <button
                type="button"
                onClick={() => setGrade('')}
                className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all min-w-[4.5rem] text-center ${
                  grade === ''
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border hover:border-foreground/50'
                }`}
              >
                Ungraded
              </button>
            </div>

            {/* Grade groups */}
            <div className="space-y-3">
              {GRADE_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/50 mb-1.5">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.grades.map(g => {
                      const selected = grade === g
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGrade(selected ? '' : g)}
                          className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all min-w-[4.5rem] text-center ${
                            selected
                              ? 'bg-foreground text-background border-foreground'
                              : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          {g}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Max Price */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-maxprice">
              Max Price <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="edit-maxprice"
                type="number"
                min="0"
                step="1"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="No limit"
                className="pl-7"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. CAMEO preferred, original skin"
              rows={3}
            />
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
