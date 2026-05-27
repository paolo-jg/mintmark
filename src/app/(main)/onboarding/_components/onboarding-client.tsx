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
  referralCode: string | null
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/

const PLANS = [
  {
    key: 'collector_basic',
    name: 'Free',
    fullName: 'Collector Basic',
    price: '$0',
    per: '/mo',
    description: 'Get listed and start buying and selling rare coins.',
    features: ['7% seller fee', '$0.50 per listing', 'Up to 10 active listings/month', 'Unlimited purchases'],
    cta: 'Start Free',
    highlight: false,
    badge: null,
  },
  {
    key: 'collector_premium',
    name: 'Premium',
    fullName: 'Collector Premium',
    price: '$9.99',
    per: '/mo',
    description: 'Lower fees and more listings for active collectors.',
    features: ['1.9% seller fee', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    cta: 'Choose Premium',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    key: 'dealer',
    name: 'Dealer',
    fullName: 'Dealer',
    price: '$49.99',
    per: '/mo',
    description: 'Unlimited listings and the lowest fees for serious dealers.',
    features: ['0% seller fee', '$0 per listing', 'Unlimited listings', 'Unlimited purchases', 'Advanced analytics'],
    cta: 'Choose Dealer',
    highlight: false,
    badge: null,
  },
]

export function OnboardingClient({ initialUsername, referralCode }: Props) {
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

  async function saveAndRedirect(destination: string, planKey?: string) {
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
      await supabase
        .from('profiles_private')
        .upsert({ id: user.id, first_name: firstName.trim() || null, last_name: lastName.trim() || null })
        .then(() => null, () => null)

      // If referred and chose a paid plan, complete the referral
      if (referralCode && (planKey === 'collector_premium' || planKey === 'dealer')) {
        await fetch('/api/referrals/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referral_code: referralCode, chosen_tier: planKey }),
        }).catch(() => null)
      }

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

      {/* Modal card — wider and taller on step 3 to fit plan cards */}
      <div className={`relative z-10 w-full bg-background rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${step === 3 ? 'max-w-4xl' : 'max-w-xl'}`}>

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
                {referralCode ? (
                  <>
                    <h1 className="text-3xl font-bold tracking-tight">Your first month is free</h1>
                    <p className="text-muted-foreground mt-2">You were referred. Collector Premium is on us for the first month.</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold tracking-tight">Choose a plan</h1>
                    <p className="text-muted-foreground mt-2">Start free and upgrade whenever you're ready.</p>
                  </>
                )}
              </div>

              {referralCode ? (
                /* Referred users: Premium (1 month free) + Dealer (full price), no Free option */
                <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                  {/* Premium — referral bonus */}
                  <div className="relative rounded-xl border border-foreground bg-foreground text-background p-6 flex flex-col gap-4">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase bg-green-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                      1 Month Free
                    </span>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5 text-background/50">Collector Premium</p>
                      <p className="text-lg font-bold mb-3">Premium</p>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-3xl font-bold tracking-tight line-through opacity-40">$9.99</span>
                        <span className="text-xl font-bold text-green-400 ml-2">Free</span>
                        <span className="text-xs text-background/60 ml-1">first month</span>
                      </div>
                      <p className="text-xs leading-snug text-background/60">Then $9.99/mo. Cancel anytime.</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {['1.9% seller fee', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'].map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-3 w-3 mt-0.5 shrink-0 text-background/60" />
                          <span className="text-xs leading-snug text-background/80">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full h-10 text-sm font-semibold mt-1 bg-white text-zinc-900 hover:bg-white/90 border-0"
                      onClick={() => saveAndRedirect('/listings', 'collector_premium')}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Claim Free Month'}
                    </Button>
                  </div>

                  {/* Dealer — also 1 month free */}
                  <div className="relative rounded-xl border border-border bg-background p-6 flex flex-col gap-4">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase bg-green-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                      1 Month Free
                    </span>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5 text-muted-foreground/50">Dealer</p>
                      <p className="text-lg font-bold mb-3">Dealer</p>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-3xl font-bold tracking-tight line-through opacity-40">$49.99</span>
                        <span className="text-xl font-bold text-green-400 ml-2">Free</span>
                        <span className="text-xs text-muted-foreground ml-1">first month</span>
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground">Then $49.99/mo. Unlimited listings and the lowest fees for serious dealers.</p>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {['0% seller fee', '$0 per listing', 'Unlimited listings', 'Unlimited purchases', 'Advanced analytics'].map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="text-xs leading-snug text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full h-10 text-sm font-semibold mt-1 bg-foreground text-background hover:bg-foreground/90"
                      onClick={() => saveAndRedirect('/pricing', 'dealer')}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Claim Free Month'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Normal users: all three plans */
                <div className="grid grid-cols-3 gap-4">
                  {PLANS.map(plan => (
                    <div
                      key={plan.key}
                      className={`relative rounded-xl border p-6 flex flex-col gap-4 ${
                        plan.highlight
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-background'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase bg-foreground text-background px-3 py-0.5 rounded-full whitespace-nowrap">
                          {plan.badge}
                        </span>
                      )}
                      <div>
                        <p className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-0.5 ${plan.highlight ? 'text-background/50' : 'text-muted-foreground/50'}`}>
                          {plan.fullName}
                        </p>
                        <p className="text-lg font-bold mb-3">{plan.name}</p>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                          <span className={`text-xs ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`}>{plan.per}</span>
                        </div>
                        <p className={`text-xs leading-snug ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`}>
                          {plan.description}
                        </p>
                      </div>
                      <ul className="space-y-1.5 flex-1">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className={`h-3 w-3 mt-0.5 shrink-0 ${plan.highlight ? 'text-background/60' : 'text-muted-foreground'}`} />
                            <span className={`text-xs leading-snug ${plan.highlight ? 'text-background/80' : 'text-muted-foreground'}`}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full h-10 text-sm font-semibold mt-1 ${
                          plan.highlight
                            ? 'bg-white text-zinc-900 hover:bg-white/90 border-0'
                            : 'bg-foreground text-background hover:bg-foreground/90'
                        }`}
                        onClick={() => saveAndRedirect(plan.key === 'collector_basic' ? '/listings' : '/pricing', plan.key)}
                        disabled={saving}
                      >
                        {saving ? 'Saving…' : plan.cta}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

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
