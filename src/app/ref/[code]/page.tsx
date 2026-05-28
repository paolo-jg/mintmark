export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getServiceDb } from '@/lib/admin'
import Link from 'next/link'
import { SetRefCookie } from './_components/set-ref-cookie'

export default async function ReferralLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const db = getServiceDb()

  // Validate the referral code exists
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
      features: ['0% seller fee', '$0 per listing', 'Unlimited listings', 'Unlimited purchases', 'Advanced analytics'],
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-zinc-950">
      <SetRefCookie code={code.toUpperCase()} />
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8">
          <img src="/logo-horizontal.png" alt="Pedigree Coins" className="h-10 w-auto" />
        </div>

        <div className="text-center mb-8 space-y-2">
          <p className="text-zinc-400 text-sm">
            <span className="text-white font-semibold">{referrerName}</span> invited you to Pedigree Coins
          </p>
          <h1 className="text-3xl font-bold text-white">Your first month is free</h1>
          <p className="text-zinc-400 text-sm">Choose a paid plan and we'll waive your first month.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {plans.map(plan => (
            <div key={plan.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wider uppercase bg-green-500 text-white px-3 py-0.5 rounded-full whitespace-nowrap">
                1 Month Free
              </span>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-1">{plan.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white line-through opacity-40">{plan.price}</span>
                  <span className="text-xl font-bold text-green-400">Free</span>
                  <span className="text-xs text-zinc-500">first month</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Then {plan.price}/mo</p>
              </div>
              <ul className="space-y-1.5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <svg className="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Link
          href="/auth/register"
          className="block w-full py-3 px-6 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm text-center"
        >
          Create your account →
        </Link>

        <p className="text-xs text-zinc-500 text-center mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="underline underline-offset-2 hover:text-zinc-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
