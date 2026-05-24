'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  initialDisplayName: string
  initialDealerLogoUrl: string
  initialDealerDescription: string
  isDealer: boolean
}

export function ProfileForm({
  initialDisplayName,
  initialDealerLogoUrl,
  initialDealerDescription,
  isDealer,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [dealerLogoUrl, setDealerLogoUrl] = useState(initialDealerLogoUrl)
  const [dealerDescription, setDealerDescription] = useState(initialDealerDescription)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const body: Record<string, string> = { display_name: displayName.trim() }
    if (isDealer) {
      body.dealer_logo_url = dealerLogoUrl.trim()
      body.dealer_description = dealerDescription.trim()
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
      } else {
        toast.success('Profile saved')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold">Display Information</p>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name or business name"
            maxLength={80}
          />
          <p className="text-xs text-muted-foreground">
            Shown publicly on your seller profile instead of your email.
          </p>
        </div>

        {isDealer && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="dealerLogoUrl">
                Logo URL <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="dealerLogoUrl"
                type="url"
                value={dealerLogoUrl}
                onChange={e => setDealerLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Direct link to your business logo image. Shown on your dealer card.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dealerDescription">
                Business Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="dealerDescription"
                value={dealerDescription}
                onChange={e => setDealerDescription(e.target.value)}
                placeholder="Tell buyers about your business, specialties, and experience..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {dealerDescription.length}/500 characters
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
          ) : (
            'Save Profile'
          )}
        </Button>
      </div>
    </form>
  )
}
