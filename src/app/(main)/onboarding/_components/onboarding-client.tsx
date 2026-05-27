'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

type Step = 1 | 2 | 3

interface Props {
  initialUsername: string
  initialDisplayName: string
  currentTier: string
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

const PLANS = [
  {
    key: 'collector_basic',
    name: 'Free',
    price: '$0',
    per: '/mo',
    features: ['10 listings/month', '7% seller fee', 'Unlimited purchases'],
    cta: 'Start Free',
    highlight: false,
    badge: null,
  },
  {
    key: 'collector_premium',
    name: 'Premium',
    price: '$9.99',
    per: '/mo',
    features: ['50 listings/month', '1.9% seller fee', 'Unlimited purchases'],
    cta: 'Choose Premium',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    key: 'dealer',
    name: 'Dealer',
    price: '$49.99',
    per: '/mo',
    features: ['Unlimited listings', '0% seller fee', 'Advanced analytics'],
    cta: 'Choose Dealer',
    highlight: false,
    badge: null,
  },
]

export function OnboardingClient({ initialUsername }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState(initialUsername)
  const [shopName, setShopName] = useState('')
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function validateUsernameFormat(value: string): string | null {
    if (!value) return 'Username is required'
    if (!USERNAME_REGEX.test(value))
      return '3–30 characters: lowercase letters, numbers and underscores only'
    return null
  }

  async function checkUsernameUnique(value: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value)
      .neq('id', user?.id ?? '')
      .maybeSingle()
    return !existing
  }

  async function handleUsernameBlur() {
    const err = validateUsernameFormat(username)
    if (err) { setUsernameError(err); return }
    const unique = await checkUsernameUnique(username)
    setUsernameError(unique ? null : 'That username is already taken')
  }

  async function handleStep2Continue() {
    const err = validateUsernameFormat(username)
    if (err) { setUsernameError(err); return }
    const unique = await checkUsernameUnique(username)
    if (!unique) { setUsernameError('That username is already taken'); return }
    setUsernameError(null)
    setStep(3)
  }

  async function saveAndRedirect(destination: string) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session expired. Please log in again.')
        router.push('/auth/login')
        setSaving(false)
        return
      }

      const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || null

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: shopName.trim() || displayName,
          onboarding_completed: true,
        })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }

      // Store first/last name privately — owner-only RLS, never public
      // Ignore errors: table may not exist yet, don't block onboarding
      await supabase
        .from('profiles_private')
        .upsert({ id: user.id, first_name: firstName.trim() || null, last_name: lastName.trim() || null })
        .then(() => null, () => null)

      router.push(destination)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  const totalSteps = 3
  const pct = ((step - 1) / (totalSteps - 1)) * 100

  return (
    /* Full-screen overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">

      {/* Decorative backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/40 via-transparent to-transparent" />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-xl bg-background rounded-2xl shadow-2xl overflow-hidden">

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="px-8 pt-8 pb-10">

          {/* Step indicator */}
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-6">
            Step {step} of {totalSteps}
          </p>

          {/* ── STEP 1: Name ─────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-7">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome to Pedigree Coins</h1>
                <p className="text-muted-foreground mt-2">Let's start with your name.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="First name"
                    autoComplete="given-name"
                    autoFocus
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={() => setStep(2)}
                disabled={!firstName.trim() || !lastName.trim()}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* ── STEP 2: Username + Shop Name ─────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-7">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Create your identity</h1>
                <p className="text-muted-foreground mt-2">
                  Your username is how buyers and sellers find you.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase()); setUsernameError(null) }}
                    onBlur={handleUsernameBlur}
                    placeholder="coinlover42"
                    autoComplete="username"
                    autoFocus
                    className={`h-12 text-base ${usernameError ? 'border-destructive' : ''}`}
                  />
                  {usernameError
                    ? <p className="text-sm text-destructive">{usernameError}</p>
                    : <p className="text-sm text-muted-foreground">3–30 chars · lowercase, numbers, underscores only</p>
                  }
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopName" className="text-sm font-medium">
                    Shop / Display Name{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="shopName"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    placeholder="e.g. Morgan Dollar Specialist"
                    maxLength={80}
                    className="h-12 text-base"
                  />
                  <p className="text-sm text-muted-foreground">
                    Shown on your seller storefront instead of your username.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="h-12 px-6" onClick={() => setStep(1)}>
                  ← Back
                </Button>
                <Button
                  className="flex-1 h-12 text-base"
                  onClick={handleStep2Continue}
                  disabled={!!usernameError}
                >
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Plan ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Choose a plan</h1>
                <p className="text-muted-foreground mt-2">Start free and upgrade whenever you're ready.</p>
              </div>

              <div className="space-y-3">
                {PLANS.map(plan => (
                  <div
                    key={plan.key}
                    className={`relative rounded-xl border px-5 py-4 flex items-center gap-4 ${
                      plan.highlight
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-5 text-[10px] font-bold tracking-wider uppercase bg-foreground text-background px-2.5 py-0.5 rounded-full">
                        {plan.badge}
                      </span>
                    )}

                    {/* Price */}
                    <div className="w-28 shrink-0">
                      <p className={`text-[11px] font-semibold uppercase tracking-widest mb-0.5 ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`}>
                        {plan.name}
                      </p>
                      <p className="text-xl font-bold leading-none">
                        {plan.price}
                        <span className={`text-xs font-normal ml-0.5 ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`}>
                          {plan.per}
                        </span>
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="flex-1 flex flex-wrap gap-x-4 gap-y-1">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-1 text-sm">
                          <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`} />
                          <span className={plan.highlight ? 'text-background/80' : 'text-muted-foreground'}>
                            {f}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      variant="outline"
                      className={`shrink-0 h-10 px-5 text-sm font-medium ${
                        plan.highlight
                          ? 'border-background/50 bg-transparent text-background hover:bg-background hover:text-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                      onClick={() => saveAndRedirect(plan.key === 'collector_basic' ? '/listings' : '/pricing')}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : plan.cta}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                className="w-full h-10 text-muted-foreground"
                onClick={() => setStep(2)}
                disabled={saving}
              >
                ← Back
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
