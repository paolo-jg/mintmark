'use client'

import { useEffect, useState } from 'react'
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

export function OnboardingClient({ initialUsername, initialDisplayName, referralCode }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [displayNameError, setDisplayNameError] = useState<string | null>(null)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [saving, setSaving] = useState(false)

  // On mount: handle Stripe return or resume from back-press
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('ob_done') === '1') {
      // Stripe checkout completed - mark onboarding done and enter the app
      localStorage.removeItem('pc_ob_pending')
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', user.id)
            .then(() => router.replace('/listings'), () => router.replace('/listings'))
        } else {
          router.replace('/listings')
        }
      })
      return
    }

    if (localStorage.getItem('pc_ob_pending') === '1') {
      // User backed out of Stripe - resume at plan selection
      setStep(3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-generate a unique username from display name
  async function generateUsername(base: string): Promise<string> {
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 25) || 'user'
    const { data: { user } } = await supabase.auth.getUser()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', slug)
      .neq('id', user?.id ?? '')
      .maybeSingle()
    if (!existing) return slug
    const suffix = Math.floor(1000 + Math.random() * 9000)
    return `${slug}_${suffix}`
  }

  async function handleStep2Continue() {
    const trimmed = displayName.trim()
    if (!trimmed) { setDisplayNameError('Display name is required'); return }
    if (trimmed.length < 2) { setDisplayNameError('Must be at least 2 characters'); return }
    setDisplayNameError(null)
    setStep(3)
  }

  async function saveAndRedirect(planKey: string) {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Session expired. Please log in again.')
        router.push('/auth/login')
        setSaving(false)
        return
      }

      const username = initialUsername || await generateUsername(displayName.trim())

      const isPaid = planKey !== 'collector_basic'

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          display_name: displayName.trim(),
          // For paid plans, onboarding_completed is set after Stripe returns successfully.
          // For free plans, mark complete immediately.
          ...(isPaid ? {} : { onboarding_completed: true }),
        })
        .eq('id', user.id)

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }

      // Store first/last name privately
      await supabase
        .from('profiles_private')
        .upsert({ id: user.id, first_name: firstName.trim() || null, last_name: lastName.trim() || null })
        .then(() => null, () => null)

      // If referred and chose a paid plan, complete the referral
      if (referralCode && isPaid) {
        await fetch('/api/referrals/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referral_code: referralCode, chosen_tier: planKey }),
        }).catch(() => null)
      }

      // Free plan - go straight to app
      if (!isPaid) {
        localStorage.removeItem('pc_ob_pending')
        router.push('/listings')
        return
      }

      // Paid plan - flag that we're mid-onboarding so back-press resumes at step 3
      localStorage.setItem('pc_ob_pending', '1')

      // Return URL lands back on /onboarding with ?ob_done=1 to complete onboarding
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planKey, return_url: '/onboarding?ob_done=1' }),
      })
      const json = await res.json()
      if (json.url) {
        window.location.href = json.url
      } else {
        toast.error(json.error ?? 'Something went wrong')
        setSaving(false)
      }
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

      {/* Backdrop */}
      <div className="absolute inset-0 bg-background" />

      {/* Modal card - wider and taller on step 3 to fit plan cards */}
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

              <div className="flex items-center gap-3">
                <input
                  id="tosAccept"
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={e => setTosAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-foreground cursor-pointer flex-shrink-0"
                />
                <label htmlFor="tosAccept" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:opacity-70 transition-opacity">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:opacity-70 transition-opacity">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <Button
                className="w-full h-12 text-base"
                onClick={() => setStep(2)}
                disabled={!firstName.trim() || !lastName.trim() || !tosAccepted}
              >
                Continue
              </Button>
            </div>
          )}

          {/* ── STEP 2: Display Name ─────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-7">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Create your profile</h1>
                <p className="text-muted-foreground mt-2">
                  This is your public name on Pedigree Coins. If you are a dealer or company owner, use your company name.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setDisplayNameError(null) }}
                  placeholder="e.g. Morgan Dollar Specialist"
                  maxLength={80}
                  autoFocus
                  className={`h-12 text-base ${displayNameError ? 'border-destructive' : ''}`}
                />
                {displayNameError && <p className="text-sm text-destructive">{displayNameError}</p>}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="h-12 px-6" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 text-base"
                  onClick={handleStep2Continue}
                  disabled={!displayName.trim()}
                >
                  Continue
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
                  {/* Premium - referral bonus */}
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
                      onClick={() => saveAndRedirect('collector_premium')}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : 'Claim Free Month'}
                    </Button>
                  </div>

                  {/* Dealer - also 1 month free */}
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
                      onClick={() => saveAndRedirect('dealer')}
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
                        onClick={() => saveAndRedirect(plan.key)}
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
                Back
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
