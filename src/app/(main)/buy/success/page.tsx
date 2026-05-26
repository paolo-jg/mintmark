import { redirect } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import stripe from '@/lib/stripe'

export default async function BuySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams

  if (!session_id) redirect('/listings')

  // ── Verify payment with Stripe ─────────────────────────────────────────────
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(session_id)
  } catch {
    redirect('/listings')
  }

  if (session.payment_status !== 'paid') {
    redirect('/listings')
  }

  // ── Success UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Payment confirmed!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your purchase is complete. The seller will ship your coin soon.
            You&apos;ll find it in your collection once it arrives.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            href="/collect"
            className="w-full inline-flex items-center justify-center rounded-xl bg-foreground text-background text-sm font-semibold h-11 px-4 hover:opacity-90 transition-opacity"
          >
            View My Collection
          </Link>
          <Link
            href="/listings"
            className="w-full inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium h-11 px-4 hover:bg-muted transition-colors"
          >
            Keep Browsing
          </Link>
        </div>
      </div>
    </div>
  )
}
