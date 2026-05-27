'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Coins } from 'lucide-react'
import { LOGO_HORIZONTAL } from '@/lib/brand'
import { toast } from 'sonner'

type Tier = 'collector_basic' | 'collector_premium' | 'dealer'

interface Props {
  initialUsername: string
  initialDisplayName: string
  currentTier: Tier
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

export function OnboardingClient({ initialUsername, initialDisplayName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<1 | 2>(1)
  const [username, setUsername] = useState(initialUsername)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Username validation ────────────────────────────────────────────────────

  function validateUsernameFormat(value: string): string | null {
    if (!value) return 'Username is required'
    if (!USERNAME_REGEX.test(value))
      return 'Username must be 3–30 characters: lowercase letters, numbers, underscores only'
    return null
  }

  async function handleUsernameBlur() {
    const formatErr = validateUsernameFormat(username)
    if (formatErr) {
      setUsernameError(formatErr)
      return
    }

    // Check uniqueness
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user?.id ?? '')
      .maybeSingle()

    if (existing) {
      setUsernameError('That username is already taken')
    } else {
      setUsernameError(null)
    }
  }

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────────

  async function handleContinue() {
    const formatErr = validateUsernameFormat(username)
    if (formatErr) {
      setUsernameError(formatErr)
      return
    }

    // Re-check uniqueness before advancing
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', user?.id ?? '')
      .maybeSingle()

    if (existing) {
      setUsernameError('That username is already taken')
      return
    }

    setUsernameError(null)
    setStep(2)
  }

  // ── Final save + redirect ─────────────────────────────────────────────────

  async function saveAndRedirect(destination: string) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Session expired. Please log in again.')
      router.push('/auth/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        display_name: displayName.trim() || null,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    router.push(destination)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/20">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Coins className="h-5 w-5" />
            Pedigree Coins
          </div>
        </div>

        {step === 1 ? (
          <Card>
            <CardHeader>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Step 1 of 2 · Your Profile
              </p>
              <CardTitle className="text-2xl">Welcome to Pedigree Coins</CardTitle>
              <CardDescription>Let&apos;s set up your account in 2 quick steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value)
                    setUsernameError(null)
                  }}
                  onBlur={handleUsernameBlur}
                  placeholder="coinlover42"
                  autoComplete="username"
                  className={usernameError ? 'border-destructive' : ''}
                />
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  3–30 characters · lowercase letters, numbers, underscores only
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <Label htmlFor="displayName">
                  Display Name / Shop Name{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Morgan Dollar Specialist"
                  maxLength={80}
                />
              </div>

              <Button className="w-full" onClick={handleContinue} disabled={!!usernameError}>
                Continue →
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Step 2 of 2 · Choose a Plan
              </p>
              <CardTitle className="text-2xl">Start free, upgrade anytime</CardTitle>
              <CardDescription>You can change your plan at any time from Settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Free */}
                <div className="rounded-xl border border-border p-4 space-y-3 flex flex-col">
                  <div>
                    <p className="font-semibold text-sm">Free</p>
                    <p className="text-2xl font-bold mt-1">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 flex-1">
                    <li>10 listings/month</li>
                    <li>7% seller fee</li>
                    <li className="text-foreground/60 text-xs pt-1">Best for casual collectors</li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => saveAndRedirect('/listings')}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Start Free'}
                  </Button>
                </div>

                {/* Premium */}
                <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3 flex flex-col relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Popular
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Premium</p>
                    <p className="text-2xl font-bold mt-1">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 flex-1">
                    <li>50 listings/month</li>
                    <li>1.9% seller fee</li>
                    <li className="text-foreground/60 text-xs pt-1">Best for active collectors</li>
                  </ul>
                  <Button
                    className="w-full mt-auto"
                    onClick={() => saveAndRedirect('/pricing')}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Choose Premium'}
                  </Button>
                </div>

                {/* Dealer */}
                <div className="rounded-xl border border-border p-4 space-y-3 flex flex-col">
                  <div>
                    <p className="font-semibold text-sm">Dealer</p>
                    <p className="text-2xl font-bold mt-1">$49.99<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 flex-1">
                    <li>Unlimited listings</li>
                    <li>0% seller fee</li>
                    <li className="text-foreground/60 text-xs pt-1">Best for professional dealers</li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full mt-auto"
                    onClick={() => saveAndRedirect('/pricing')}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Choose Dealer'}
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setStep(1)}
                disabled={saving}
              >
                ← Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
