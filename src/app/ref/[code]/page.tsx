import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServiceDb } from '@/lib/admin'
import Link from 'next/link'

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

  // Set the referral cookie (30 days)
  const cookieStore = await cookies()
  cookieStore.set('pc_ref', code.toUpperCase(), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })

  const referrerName = referrer.display_name ?? `@${referrer.username}`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-950">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8">
          <img src="/logo-horizontal.png" alt="Pedigree Coins" className="h-10 w-auto" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-zinc-400 text-sm">You were invited by</p>
            <p className="text-white font-semibold text-lg">{referrerName}</p>
          </div>

          <div className="border-t border-zinc-800 pt-6 space-y-2">
            <h1 className="text-2xl font-bold text-white">Get 1 month free</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Sign up for Collector Premium and your first month is on us.
              Lower fees, more listings, and the full Pedigree Coins experience.
            </p>
          </div>

          <div className="bg-zinc-800/60 rounded-xl p-4 text-left space-y-2">
            {[
              '1.9% seller fee (vs 7% on Free)',
              'Up to 50 active listings/month',
              '$0.40 per listing',
              'First month completely free',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                <svg className="h-4 w-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {f}
              </div>
            ))}
          </div>

          <Link
            href="/auth/register"
            className="block w-full py-3 px-6 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors text-sm"
          >
            Create your account
          </Link>

          <p className="text-xs text-zinc-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="underline underline-offset-2 hover:text-zinc-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
