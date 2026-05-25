import { type NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get('account')

  if (!accountId) {
    return NextResponse.redirect(new URL('/sell', req.nextUrl.origin))
  }

  try {
    // The original onboarding link expired — generate a fresh one
    const baseUrl = req.nextUrl.origin

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect/refresh?account=${accountId}`,
      return_url: `${baseUrl}/api/stripe/connect/return?account=${accountId}`,
      type: 'account_onboarding',
    })

    return NextResponse.redirect(accountLink.url)
  } catch (err) {
    console.error('[stripe/connect/refresh]', err)
    return NextResponse.redirect(new URL('/sell', req.nextUrl.origin))
  }
}
