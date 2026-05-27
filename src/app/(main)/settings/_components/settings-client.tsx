'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  User, CreditCard, Building2, Loader2, ImagePlus,
  ExternalLink, CheckCircle2, AlertCircle, Star, ShieldCheck,
  Eye, EyeOff, ChevronRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string
  email: string
  activeTab: string
  isDealer: boolean
  subscriptionTier: string
  displayName: string
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
  dealerLogoUrl: string
  dealerBannerUrl: string
  dealerDescription: string
  dealerTagline: string
  averageRating: number
  ratingCount: number
  completedOrdersCount: number
  memberSince: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_META: Record<string, { label: string; color: string; features: string[]; sellerFee: string; buyerFee: string }> = {
  collector_basic: {
    label: 'Collector (Free)',
    color: 'secondary',
    sellerFee: '7%',
    buyerFee: '7%',
    features: [
      'Up to 5 active listings per month',
      'Basic seller profile',
      'Standard buyer & seller fees (7%)',
      'Full marketplace access',
    ],
  },
  collector_premium: {
    label: 'Collector Premium',
    color: 'secondary',
    sellerFee: '1.9%',
    buyerFee: '1.9%',
    features: [
      'Up to 50 active listings per month',
      'Reduced buyer & seller fees (1.9%)',
      'Priority search placement',
      'Full marketplace access',
    ],
  },
  dealer: {
    label: 'Dealer',
    color: 'default',
    sellerFee: '0%',
    buyerFee: '1%',
    features: [
      'Unlimited listings',
      '0% seller fees',
      '1% buyer fee',
      'Custom storefront with banner & branding',
      'Bulk CSV import',
      'Team management',
      'Priority support',
    ],
  },
}

async function uploadProfileImage(file: File, path: string): Promise<string> {
  const supabase = createClient()
  const { error } = await supabase.storage
    .from('profile-images')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (error) throw new Error(error.message)
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function ImageUpload({
  label, hint, value, aspect, onUpload,
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
          aspect === 'banner' ? 'h-32 w-full' : 'h-24 w-24'
        }`}
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-medium">Change</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <ImagePlus className="h-5 w-5" />}
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
        <button type="button" onClick={() => onUpload('')} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
          Remove
        </button>
      )}
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ── Account Tab ───────────────────────────────────────────────────────────────

function AccountTab({ email, displayName, userId }: { email: string; displayName: string; userId: string }) {
  const router = useRouter()
  const [name, setName] = useState(displayName)
  const [savingName, setSavingName] = useState(false)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const saveName = async () => {
    if (!name.trim()) { toast.error('Name cannot be empty'); return }
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: name.trim() }),
      })
      const json = await res.json()
      if (json.error) toast.error(json.error)
      else toast.success('Name updated')
    } catch { toast.error('Something went wrong') }
    finally { setSavingName(false) }
  }

  const changePassword = async () => {
    if (!newPw) { toast.error('Enter a new password'); return }
    if (newPw.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    setSavingPw(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) toast.error(error.message)
      else {
        toast.success('Password updated')
        setCurrentPw(''); setNewPw(''); setConfirmPw('')
      }
    } catch { toast.error('Something went wrong') }
    finally { setSavingPw(false) }
  }

  const deleteAccount = async () => {
    if (deleteConfirm !== email) { toast.error('Email does not match'); return }
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      const json = await res.json()
      if (json.error) { toast.error(json.error); setDeleting(false); return }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch { toast.error('Something went wrong'); setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Profile">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="displayName"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name or business name"
              maxLength={80}
              className="flex-1"
            />
            <Button onClick={saveName} disabled={savingName || name === displayName}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Shown publicly on your profile and listings.</p>
        </div>

        <div className="space-y-1.5">
          <Label>Email Address</Label>
          <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
            {email}
          </div>
          <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
        </div>
      </SectionCard>

      <SectionCard title="Change Password">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="newPw">New Password</Label>
            <div className="relative">
              <Input
                id="newPw"
                type={showPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-9"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPw">Confirm New Password</Label>
            <Input
              id="confirmPw"
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={savingPw || !newPw || !confirmPw}>
              {savingPw ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating…</> : 'Update Password'}
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-destructive/20">
          <p className="text-sm font-semibold text-destructive">Danger Zone</p>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data — listings, orders, and collection items. This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="deleteConfirm" className="text-destructive/80">
              Type your email address to confirm: <span className="font-mono font-semibold">{email}</span>
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={email}
              className="border-destructive/30 focus-visible:ring-destructive/30"
            />
          </div>
          <Button
            variant="destructive"
            disabled={deleting || deleteConfirm !== email}
            onClick={deleteAccount}
          >
            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</> : 'Delete My Account'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Billing Tab ───────────────────────────────────────────────────────────────

function BillingTab({
  subscriptionTier,
  stripeAccountId,
  stripeOnboardingComplete,
  averageRating,
  ratingCount,
  completedOrdersCount,
  memberSince,
  isDealer,
}: {
  subscriptionTier: string
  stripeAccountId: string | null
  stripeOnboardingComplete: boolean
  averageRating: number
  ratingCount: number
  completedOrdersCount: number
  memberSince: string | null
  isDealer: boolean
}) {
  const [connectingStripe, setConnectingStripe] = useState(false)

  const tier = TIER_META[subscriptionTier] ?? TIER_META.collector_basic
  const memberYear = memberSince ? new Date(memberSince).getFullYear() : null

  const startStripeConnect = async () => {
    setConnectingStripe(true)
    try {
      const res = await fetch('/api/stripe/connect/create', { method: 'POST' })
      const json = await res.json()
      if (json.url) window.location.href = json.url
      else toast.error(json.error ?? 'Failed to start Stripe onboarding')
    } catch { toast.error('Something went wrong') }
    finally { setConnectingStripe(false) }
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <SectionCard title="Current Plan">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{tier.label}</p>
              <Badge variant={tier.color as 'default' | 'secondary'}>{tier.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Member since {memberYear ?? '—'}
            </p>
          </div>
          {subscriptionTier !== 'dealer' && (
            <Button variant="outline" size="sm" disabled className="text-xs">
              Upgrade — Coming Soon
            </Button>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          {tier.features.map(f => (
            <div key={f} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-foreground/60 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{f}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Fee rates */}
      <SectionCard title="Transaction Fees">
        <p className="text-xs text-muted-foreground">
          Fees applied per completed transaction on your account.
        </p>
        <div className="rounded-lg border border-border overflow-hidden text-sm">
          <div className="grid grid-cols-2 bg-muted/40 px-4 py-2.5 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
            <span>Fee Type</span>
            <span>Rate</span>
          </div>
          <div className="divide-y divide-border">
            <div className="grid grid-cols-2 px-4 py-3">
              <span className="text-muted-foreground">Seller fee</span>
              <span className="font-semibold">{tier.sellerFee}</span>
            </div>
            <div className="grid grid-cols-2 px-4 py-3">
              <span className="text-muted-foreground">Buyer fee</span>
              <span className="font-semibold">{tier.buyerFee}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Payments are processed securely via Stripe. Payouts are sent to your connected bank account.
        </p>
      </SectionCard>

      {/* Account stats */}
      <SectionCard title="Account Stats">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-0.5">
            <p className="text-2xl font-bold tabular-nums">{completedOrdersCount}</p>
            <p className="text-xs text-muted-foreground">Completed Sales</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-bold tabular-nums">
              {ratingCount > 0 ? averageRating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Star className="h-3 w-3" /> Avg Rating
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl font-bold tabular-nums">{ratingCount}</p>
            <p className="text-xs text-muted-foreground">Reviews</p>
          </div>
        </div>
      </SectionCard>

      {/* Stripe Connect */}
      <SectionCard title="Payout Account">
        {stripeOnboardingComplete ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Stripe account connected</p>
              <p className="text-xs text-muted-foreground">You&apos;re set up to receive payouts from your sales.</p>
            </div>
          </div>
        ) : stripeAccountId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Onboarding incomplete</p>
                <p className="text-xs text-muted-foreground">Finish setting up your Stripe account to receive payouts.</p>
              </div>
            </div>
            <Button size="sm" onClick={startStripeConnect} disabled={connectingStripe}>
              {connectingStripe ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : 'Continue Stripe Setup'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect a Stripe account to receive payouts when your coins sell.
            </p>
            <Button size="sm" onClick={startStripeConnect} disabled={connectingStripe}>
              {connectingStripe ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</> : 'Connect Stripe Account'}
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── Organization Tab (dealer only) ────────────────────────────────────────────

function OrganizationTab({
  userId,
  dealerLogoUrl: initialLogo,
  dealerBannerUrl: initialBanner,
  dealerDescription: initialDesc,
  dealerTagline: initialTagline,
}: {
  userId: string
  dealerLogoUrl: string
  dealerBannerUrl: string
  dealerDescription: string
  dealerTagline: string
}) {
  const router = useRouter()
  const [logo, setLogo] = useState(initialLogo)
  const [banner, setBanner] = useState(initialBanner)
  const [description, setDescription] = useState(initialDesc)
  const [tagline, setTagline] = useState(initialTagline)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealer_logo_url: logo,
          dealer_banner_url: banner,
          dealer_description: description,
          dealer_tagline: tagline,
        }),
      })
      const json = await res.json()
      if (json.error) toast.error(json.error)
      else { toast.success('Organization settings saved'); router.refresh() }
    } catch { toast.error('Something went wrong') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Storefront Branding">
        <div className="space-y-1.5">
          <Label htmlFor="tagline">Tagline <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="e.g. Specializing in Early American Coinage"
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">Short line shown under your store name on your storefront.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">About <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tell buyers about your business, specialties, and experience…"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
        </div>

        <ImageUpload
          label="Store Logo"
          hint="Square image, at least 200×200px. Shown on your storefront and dealer directory card."
          value={logo}
          aspect="square"
          onUpload={setLogo}
        />

        <ImageUpload
          label="Banner Image"
          hint="Wide image, at least 1200×300px recommended. Shown at the top of your storefront page."
          value={banner}
          aspect="banner"
          onUpload={setBanner}
        />

        <div className="flex items-center justify-between pt-2">
          <a
            href={`/sellers/${userId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview storefront
          </a>
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
          </Button>
        </div>
      </SectionCard>

      {/* Team management quick link */}
      <SectionCard title="Team">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Team Management</p>
            <p className="text-xs text-muted-foreground mt-0.5">Invite team members to manage your listings and orders.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/team')}>
            Manage Team <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </SectionCard>

      {/* Bulk import quick link */}
      <SectionCard title="Bulk Import">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">CSV Import</p>
            <p className="text-xs text-muted-foreground mt-0.5">Import up to 500 listings at once from a CSV file.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/import')}>
            Import Listings <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}

// ── Main Settings Client ──────────────────────────────────────────────────────

export function SettingsClient({
  userId, email, activeTab, isDealer, subscriptionTier,
  displayName, stripeAccountId, stripeOnboardingComplete,
  dealerLogoUrl, dealerBannerUrl, dealerDescription, dealerTagline,
  averageRating, ratingCount, completedOrdersCount, memberSince,
}: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    ...(isDealer ? [{ id: 'organization', label: 'Organization', icon: Building2 }] : []),
  ]

  const setTab = (id: string) => {
    startTransition(() => router.push(`/settings?tab=${id}`, { scroll: false }))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">{email}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* Sidebar nav */}
        <aside className="sm:w-48 flex-shrink-0">
          {/* User settings group */}
          <div className="mb-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1">
              {isDealer ? 'User Settings' : 'Settings'}
            </p>
            <nav className="space-y-0.5">
              {tabs.filter(t => !isDealer || t.id !== 'organization').map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      active
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Dealer-only organization group */}
          {isDealer && (
            <div className="mt-5">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50 px-3 mb-1">
                Organization Settings
              </p>
              <nav className="space-y-0.5">
                <button
                  onClick={() => setTab('organization')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === 'organization'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Organization
                </button>
              </nav>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'account' && (
            <AccountTab email={email} displayName={displayName} userId={userId} />
          )}
          {activeTab === 'billing' && (
            <BillingTab
              subscriptionTier={subscriptionTier}
              stripeAccountId={stripeAccountId}
              stripeOnboardingComplete={stripeOnboardingComplete}
              averageRating={averageRating}
              ratingCount={ratingCount}
              completedOrdersCount={completedOrdersCount}
              memberSince={memberSince}
              isDealer={isDealer}
            />
          )}
          {activeTab === 'organization' && isDealer && (
            <OrganizationTab
              userId={userId}
              dealerLogoUrl={dealerLogoUrl}
              dealerBannerUrl={dealerBannerUrl}
              dealerDescription={dealerDescription}
              dealerTagline={dealerTagline}
            />
          )}
        </main>
      </div>
    </div>
  )
}
