export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServiceDb } from '@/lib/admin'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { SetRefCookie } from './_components/set-ref-cookie'

export default async function ReferralLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const db = getServiceDb()

  const { data: referrer } = await db
    .from('profiles')
    .select('id, display_name, username, referral_code')
    .eq('referral_code', code.toUpperCase())
    .single()

  if (!referrer) redirect('/auth/register')

  const referrerName = referrer.display_name ?? `@${referrer.username}`

  const plans = [
    {
      key: 'premium',
      label: 'Collector Premium',
      price: '$9.99',
      features: ['1.9% seller fee', '$0.40 per listing', 'Up to 50 active listings/month', 'Unlimited purchases'],
    },
    {
      key: 'dealer',
      label: 'Dealer',
      price: '$49.99',
      popular: true,
      features: ['0% seller fee', '$0 per listing', 'Unlimited listings', 'Unlimited purchases', 'Advanced analytics'],
    },
  ]

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center px-4 py-16">
      <SetRefCookie code={code.toUpperCase()} />

      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/">
            <img src="/logo-horizontal.png" alt="Pedigree Coins" className="h-14 w-auto" />
          </Link>
        </div>

        {/* Headline */}
        <div className="text-center mb-10 space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{referrerName}</span> invited you to Pedigree Coins
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Your first month is free</h1>
          <p className="text-muted-foreground">
            Choose a plan below and your first month is waived. No commitment.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {plans.map(plan => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-card p-6 space-y-5 ${
                plan.popular
                  ? 'border-primary shadow-md ring-1 ring-primary/20'
                  : 'border-border'
              }`}
            >
              {/* Badge */}
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold tracking-wider uppercase bg-emerald-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                1 Month Free
              </span>

              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                  {plan.label}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold line-through text-muted-foreground/60">{plan.price}</span>
                  <span className="text-2xl font-bold text-emerald-600">Free</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Then {plan.price}/mo</p>
              </div>

              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/auth/register"
          className="block w-full py-3.5 px-6 bg-foreground text-background font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm text-center"
        >
          Create your account
        </Link>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline underline-offset-2 hover:text-foreground">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
