import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Pedigree Coins <no-reply@pedigreecoins.com>'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export async function sendWelcomeBuyer({
  to,
  name,
}: {
  to: string
  name: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Pedigree Coins',
    html: `
      <p>Hi ${name},</p>
      <p>Welcome to Pedigree Coins — the marketplace for rare coins.</p>
      <p>You can browse listings, place bids, and buy coins with confidence. Every purchase is protected by our escrow system, so your payment is held safely until delivery is confirmed.</p>
      <p><a href="https://pedigreecoins.com/buy-now">Start browsing</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendWelcomeSeller({
  to,
  name,
}: {
  to: string
  name: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "You're ready to sell on Pedigree Coins",
    html: `
      <p>Hi ${name},</p>
      <p>Your seller account is fully set up. You can now create listings and receive payouts directly to your connected bank account.</p>
      <p>Payouts are held in escrow and released 48 hours after delivery is confirmed.</p>
      <p><a href="https://pedigreecoins.com/sell">Go to your seller dashboard</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendOrderConfirmationBuyer({
  to,
  buyerName,
  orderId,
  listingTitle,
  amountCents,
}: {
  to: string
  buyerName: string
  orderId: string
  listingTitle: string
  amountCents: number
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Order confirmed – ${listingTitle}`,
    html: `
      <p>Hi ${buyerName},</p>
      <p>Your order for <strong>${listingTitle}</strong> has been confirmed for <strong>${fmt(amountCents)}</strong>.</p>
      <p>Your payment is held in escrow and will be released to the seller once delivery is confirmed. You'll receive a tracking number once the seller ships.</p>
      <p><a href="https://pedigreecoins.com/orders/${orderId}">View your order</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendNewOrderSeller({
  to,
  sellerName,
  orderId,
  listingTitle,
  payoutCents,
}: {
  to: string
  sellerName: string
  orderId: string
  listingTitle: string
  payoutCents: number
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You made a sale – ${listingTitle}`,
    html: `
      <p>Hi ${sellerName},</p>
      <p>Your listing <strong>${listingTitle}</strong> sold! Your payout of <strong>${fmt(payoutCents)}</strong> is held in escrow.</p>
      <p>Ship the item and mark it shipped. Your funds will be released 48 hours after delivery is confirmed.</p>
      <p><a href="https://pedigreecoins.com/sell">Go to your seller dashboard</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendShippingReminder({
  to,
  sellerName,
  listingTitle,
  orderId,
}: {
  to: string
  sellerName: string
  listingTitle: string
  orderId: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Reminder: ship your order – ${listingTitle}`,
    html: `
      <p>Hi ${sellerName},</p>
      <p>This is a reminder that your order for <strong>${listingTitle}</strong> is still waiting to be shipped. Buyers expect prompt shipping — please ship as soon as possible.</p>
      <p><a href="https://pedigreecoins.com/sell">Go to your seller dashboard</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendShippingUpdate({
  to,
  buyerName,
  listingTitle,
  trackingNumber,
  trackingUrl,
  carrier,
}: {
  to: string
  buyerName: string
  listingTitle: string
  trackingNumber: string
  trackingUrl: string
  carrier: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your order has shipped – ${listingTitle}`,
    html: `
      <p>Hi ${buyerName},</p>
      <p>Your order for <strong>${listingTitle}</strong> has shipped via <strong>${carrier}</strong>.</p>
      <p>Tracking number: <strong>${trackingNumber}</strong></p>
      <p><a href="${trackingUrl}">Track your package</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendPackageDelivered({
  to,
  buyerName,
  listingTitle,
}: {
  to: string
  buyerName: string
  listingTitle: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your order has been delivered – ${listingTitle}`,
    html: `
      <p>Hi ${buyerName},</p>
      <p>Your order for <strong>${listingTitle}</strong> has been marked as delivered. If everything looks good, no action is needed — the seller's funds will be released automatically in 48 hours.</p>
      <p>If there's an issue with your order, contact us before the 48-hour window closes.</p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendDisputeOpened({
  to,
  name,
  listingTitle,
  role,
}: {
  to: string
  name: string
  listingTitle: string
  role: 'buyer' | 'seller'
}) {
  const message = role === 'buyer'
    ? 'A dispute has been opened on your order. Our team and Stripe will review the case. Funds remain frozen until resolved.'
    : 'A dispute has been opened on your sale. Your payout is frozen until the dispute is resolved. Stripe will review the case and notify you.'
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Dispute opened – ${listingTitle}`,
    html: `
      <p>Hi ${name},</p>
      <p>${message}</p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendDisputeResolved({
  to,
  name,
  listingTitle,
  role,
  outcome,
}: {
  to: string
  name: string
  listingTitle: string
  role: 'buyer' | 'seller'
  outcome: 'won' | 'lost'
}) {
  let message = ''
  if (role === 'seller' && outcome === 'won') {
    message = 'The dispute on your sale was resolved in your favor. Your payout will be released shortly.'
  } else if (role === 'seller' && outcome === 'lost') {
    message = 'The dispute on your sale was resolved in the buyer\'s favor. The buyer has been refunded.'
  } else if (role === 'buyer' && outcome === 'won') {
    message = 'The dispute on your order was resolved in your favor. You have been refunded by Stripe.'
  } else {
    message = 'The dispute on your order was resolved in the seller\'s favor. The seller\'s payout has been released.'
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Dispute resolved – ${listingTitle}`,
    html: `
      <p>Hi ${name},</p>
      <p>${message}</p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendOfferReceived({
  to,
  sellerName,
  listingTitle,
  amountCents,
  buyerName,
  askingPriceCents,
}: {
  to: string
  sellerName: string
  listingTitle: string
  amountCents: number
  buyerName: string
  askingPriceCents: number
}) {
  const pct = askingPriceCents > 0 ? Math.round((amountCents / askingPriceCents) * 100) : null
  return resend.emails.send({
    from: FROM,
    to,
    subject: `New offer on ${listingTitle}`,
    html: `
      <p>Hi ${sellerName},</p>
      <p><strong>${buyerName}</strong> made an offer of <strong>${fmt(amountCents)}</strong> on your listing <strong>${listingTitle}</strong>${pct !== null ? ` (${pct}% of asking price)` : ''}.</p>
      <p>Log in to accept, decline, or counter the offer. Offers expire in 48 hours.</p>
      <p><a href="https://pedigreecoins.com/dashboard">View offers</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendOfferResponded({
  to,
  name,
  listingTitle,
  action,
  originalAmountCents,
  counterAmountCents,
}: {
  to: string
  name: string
  listingTitle: string
  action: 'accept' | 'decline' | 'counter' | 'cancel'
  originalAmountCents: number
  counterAmountCents?: number
}) {
  const messages: Record<string, string> = {
    accept: `Your offer of <strong>${fmt(originalAmountCents)}</strong> on <strong>${listingTitle}</strong> was accepted! Proceed to checkout to complete your purchase.`,
    decline: `Your offer of <strong>${fmt(originalAmountCents)}</strong> on <strong>${listingTitle}</strong> was declined by the seller.`,
    counter: `The seller countered your offer of <strong>${fmt(originalAmountCents)}</strong> on <strong>${listingTitle}</strong> with <strong>${fmt(counterAmountCents ?? 0)}</strong>. Log in to respond.`,
    cancel: `Your offer of <strong>${fmt(originalAmountCents)}</strong> on <strong>${listingTitle}</strong> has been cancelled.`,
  }
  const subjects: Record<string, string> = {
    accept: `Offer accepted – ${listingTitle}`,
    decline: `Offer declined – ${listingTitle}`,
    counter: `Counter-offer received – ${listingTitle}`,
    cancel: `Offer cancelled – ${listingTitle}`,
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: subjects[action],
    html: `
      <p>Hi ${name},</p>
      <p>${messages[action]}</p>
      <p><a href="https://pedigreecoins.com/dashboard">View your offers</a></p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendPayoutReleased({
  to,
  sellerName,
  listingTitle,
  payoutCents,
}: {
  to: string
  sellerName: string
  listingTitle: string
  payoutCents: number
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Payout released – ${listingTitle}`,
    html: `
      <p>Hi ${sellerName},</p>
      <p>Your payout of <strong>${fmt(payoutCents)}</strong> for <strong>${listingTitle}</strong> has been released to your connected Stripe account.</p>
      <p>Funds typically arrive within 2–5 business days depending on your bank.</p>
      <p>— Pedigree Coins</p>
    `,
  })
}

export async function sendTeamInvite({
  to,
  dealerName,
  role,
  inviteUrl,
}: {
  to: string
  dealerName: string
  role: string
  inviteUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${dealerName} on Pedigree Coins`,
    html: `
      <p>You've been invited to join <strong>${dealerName}</strong>'s team on Pedigree Coins as a <strong>${role}</strong>.</p>
      <p>Click the link below to accept your invitation. It expires in 7 days.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>If you don't have an account yet, you'll be able to create one after clicking the link.</p>
      <p>— Pedigree Coins</p>
    `,
  })
}
