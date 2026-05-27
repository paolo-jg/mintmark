'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, ImagePlus, X, ExternalLink } from 'lucide-react'

interface Props {
  initialDisplayName: string
  initialDealerLogoUrl: string
  initialDealerBannerUrl: string
  initialDealerDescription: string
  initialDealerTagline: string
  isDealer: boolean
  userId: string
}

async function uploadProfileImage(
  file: File,
  path: string
): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl
}

function ImageUpload({
  label,
  hint,
  value,
  aspect,
  onUpload,
}: {
  label: string
  hint: string
  value: string
  aspect: 'square' | 'banner'
  onUpload: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const url = await uploadProfileImage(file, path)
      onUpload(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div
        className={`relative border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer hover:border-foreground/30 transition-colors bg-muted/30 ${
          aspect === 'banner' ? 'h-32' : 'h-24 w-24'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <img
              src={value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-medium">Change</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <ImagePlus className="h-5 w-5" />
            }
            {!uploading && <p className="text-[10px]">Click to upload</p>}
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onUpload('')}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" /> Remove
        </button>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

export function ProfileForm({
  initialDisplayName,
  initialDealerLogoUrl,
  initialDealerBannerUrl,
  initialDealerDescription,
  initialDealerTagline,
  isDealer,
  userId,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [dealerLogoUrl, setDealerLogoUrl] = useState(initialDealerLogoUrl)
  const [dealerBannerUrl, setDealerBannerUrl] = useState(initialDealerBannerUrl)
  const [dealerDescription, setDealerDescription] = useState(initialDealerDescription)
  const [dealerTagline, setDealerTagline] = useState(initialDealerTagline)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const body: Record<string, string> = { display_name: displayName.trim() }
    if (isDealer) {
      body.dealer_logo_url = dealerLogoUrl.trim()
      body.dealer_banner_url = dealerBannerUrl.trim()
      body.dealer_description = dealerDescription.trim()
      body.dealer_tagline = dealerTagline.trim()
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
              <Label htmlFor="dealerTagline">
                Tagline <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="dealerTagline"
                value={dealerTagline}
                onChange={e => setDealerTagline(e.target.value)}
                placeholder="e.g. Specializing in Early American Coinage"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                A short line shown under your store name on your storefront.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dealerDescription">
                About <span className="text-muted-foreground font-normal">(optional)</span>
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

      {isDealer && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Storefront Branding</p>
            <a
              href={`/sellers/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Preview storefront <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <ImageUpload
            label="Store Logo"
            hint="Square image, at least 200×200px. Shown on your storefront and dealer card."
            value={dealerLogoUrl}
            aspect="square"
            onUpload={setDealerLogoUrl}
          />

          <ImageUpload
            label="Banner Image"
            hint="Wide image, at least 1200×300px recommended. Shown at the top of your storefront."
            value={dealerBannerUrl}
            aspect="banner"
            onUpload={setDealerBannerUrl}
          />
        </div>
      )}

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
