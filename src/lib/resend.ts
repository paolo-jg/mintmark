import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Pedigree Coins <no-reply@pedigreecoins.com>'
const BASE_URL = 'https://pedigreecoins.com'

function fmt(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function emailHtml({
  preheader,
  body,
  ctaLabel,
  ctaUrl,
}: {
  preheader: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
}) {
  const cta = ctaLabel && ctaUrl
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:32px 0 0;">
        <tr>
          <td align="center">
            <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:-0.01em;">${ctaLabel}</a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${preheader}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <!-- preheader -->
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${BASE_URL}/logo-horizontal.png" alt="Pedigree Coins" height="36" style="display:block;height:36px;width:auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:40px 40px 36px;">
              ${body}
              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;" align="center">
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.6;">
                You're receiving this email because you have an account at Pedigree Coins.
              </p>
              <p style="margin:0;color:#71717a;font-size:13px;">
                <a href="${BASE_URL}/settings?section=notifications" style="color:#71717a;text-decoration:underline;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${BASE_URL}/settings" style="color:#71717a;text-decoration:underline;">Email preferences</a>
              </p>
              <p style="margin:12px 0 0;color:#a1a1aa;font-size:12px;">
                © ${new Date().getFullYear()} Pedigree Coins. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function greeting(name: string) {
  return `<p style="margin:0 0 4px;color:#71717a;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Hello,</p>
<h1 style="margin:0 0 24px;color:#18181b;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${name}</h1>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />`
}

function bodyText(text: string) {
  return `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.7;">${text}</p>`
}

function metaRow(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px;white-space:nowrap;padding-right:24px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-size:13px;font-weight:600;">${value}</td>
  </tr>`
}

function metaTable(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">${rows}</table>`
}

// ─── Email functions ──────────────────────────────────────────────────────────

export async function sendWelcomeBuyer({ to, name }: { to: string; name: string }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Pedigree Coins',
    html: emailHtml({
      preheader: 'Welcome to Pedigree Coins. We\'re glad you\'re here.',
      body: `
        ${greeting(name)}
        ${bodyText('We\'re so glad you\'re here. Welcome to <strong>Pedigree Coins</strong>, a marketplace built for collectors and enthusiasts who care about the coins they buy and sell.')}
        ${bodyText('Whether you\'re hunting for a specific date and mintmark, building a type set, or just getting started, you\'ll find a curated selection of coins from sellers who share your passion.')}
        ${divider()}
        ${bodyText('Take a look around, save coins you love, and don\'t hesitate to make an offer. If you ever have a question, just reply to this email. We\'re always happy to help.')}
      `,
      ctaLabel: 'Start Browsing',
      ctaUrl: `${BASE_URL}/listings`,
    }),
  })
}

export async function sendWelcomeSeller({ to, name }: { to: string; name: string }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "You're ready to sell on Pedigree Coins",
    html: emailHtml({
      preheader: 'Your seller account is active. Create your first listing.',
      body: `
        ${greeting(name)}
        ${bodyText('Your seller account is fully set up. You can now create listings and receive payouts directly to your connected bank account.')}
        ${divider()}
        ${metaTable(
          metaRow('Payout timing', '48 hours after delivery confirmed') +
          metaRow('Shipping', 'Mark orders shipped promptly to keep buyers happy')
        )}
        ${bodyText('Your payout is released automatically 48 hours after the buyer\'s order is confirmed delivered. No action needed on your end once it ships.')}
        ${bodyText('By listing on Pedigree Coins, you certify that every coin you sell is authentic and accurately described. Misrepresentation may result in account suspension and dispute liability.')}
      `,
      ctaLabel: 'Go to Seller Dashboard',
      ctaUrl: `${BASE_URL}/sell`,
    }),
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
    subject: `Order confirmed - ${listingTitle}`,
    html: emailHtml({
      preheader: `Your order for ${listingTitle} is confirmed.`,
      body: `
        ${greeting(buyerName)}
        ${bodyText('Your order has been confirmed and payment is held in escrow.')}
        ${divider()}
        ${metaTable(
          metaRow('Item', listingTitle) +
          metaRow('Total', fmt(amountCents)) +
          metaRow('Order', `#${orderId.slice(0, 8).toUpperCase()}`) +
          metaRow('Status', 'Awaiting shipment')
        )}
        ${bodyText("Your payment is secure and will only be released to the seller once you've confirmed delivery.")}
      `,
      ctaLabel: 'View Order',
      ctaUrl: `${BASE_URL}/orders/${orderId}`,
    }),
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
    subject: `You made a sale - ${listingTitle}`,
    html: emailHtml({
      preheader: `${listingTitle} sold! Ship it to unlock your payout.`,
      body: `
        ${greeting(sellerName)}
        ${bodyText("Congratulations you made a sale! Ship the item as soon as possible to keep buyers happy.")}
        ${divider()}
        ${metaTable(
          metaRow('Item', listingTitle) +
          metaRow('Payout', fmt(payoutCents)) +
          metaRow('Order', `#${orderId.slice(0, 8).toUpperCase()}`) +
          metaRow('Status', 'Awaiting shipment from you')
        )}
        ${bodyText('Your payout is held in escrow and released 48 hours after the buyer confirms delivery.')}
      `,
      ctaLabel: 'Ship This Order',
      ctaUrl: `${BASE_URL}/sell`,
    }),
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
    subject: `Reminder: ship your order - ${listingTitle}`,
    html: emailHtml({
      preheader: 'Your buyer is waiting please ship as soon as possible.',
      body: `
        ${greeting(sellerName)}
        ${bodyText(`This is a reminder that your order for <strong>${listingTitle}</strong> is still waiting to be shipped.`)}
        ${bodyText('Buyers expect prompt shipping. Please ship as soon as possible and add a tracking number in your dashboard.')}
        ${divider()}
        ${metaTable(
          metaRow('Item', listingTitle) +
          metaRow('Order', `#${orderId.slice(0, 8).toUpperCase()}`)
        )}
      `,
      ctaLabel: 'Go to Seller Dashboard',
      ctaUrl: `${BASE_URL}/sell`,
    }),
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
    subject: `Your order has shipped - ${listingTitle}`,
    html: emailHtml({
      preheader: `${carrier} has your package track it here.`,
      body: `
        ${greeting(buyerName)}
        ${bodyText(`Your order for <strong>${listingTitle}</strong> is on its way.`)}
        ${divider()}
        ${metaTable(
          metaRow('Item', listingTitle) +
          metaRow('Carrier', carrier) +
          metaRow('Tracking', trackingNumber)
        )}
      `,
      ctaLabel: 'Track Package',
      ctaUrl: trackingUrl,
    }),
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
    subject: `Your order has been delivered - ${listingTitle}`,
    html: emailHtml({
      preheader: 'Package delivered confirm receipt to release funds.',
      body: `
        ${greeting(buyerName)}
        ${bodyText(`Your order for <strong>${listingTitle}</strong> has been marked as delivered.`)}
        ${bodyText("If everything looks good, no action is needed the seller's funds release automatically in 48 hours.")}
        ${divider()}
        ${bodyText('<strong>Issue with your order?</strong> Open a dispute before the 48-hour window closes.')}
      `,
      ctaLabel: 'View Order',
      ctaUrl: `${BASE_URL}/orders`,
    }),
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
  const detail = role === 'buyer'
    ? 'Our team and Stripe will review the case. Funds remain frozen until the dispute is resolved.'
    : 'Your payout is frozen until the dispute is resolved. Stripe will review the case and contact you directly.'
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Dispute opened - ${listingTitle}`,
    html: emailHtml({
      preheader: `A dispute has been opened on ${listingTitle}.`,
      body: `
        ${greeting(name)}
        ${bodyText(`A dispute has been opened on your ${role === 'buyer' ? 'order' : 'sale'} for <strong>${listingTitle}</strong>.`)}
        ${divider()}
        ${bodyText(detail)}
        ${bodyText('If you have additional information or documentation, reply to this email.')}
      `,
    }),
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
  let detail = ''
  if (role === 'seller' && outcome === 'won') {
    detail = 'The dispute was resolved in your favor. Your payout will be released shortly.'
  } else if (role === 'seller' && outcome === 'lost') {
    detail = "The dispute was resolved in the buyer's favor. The buyer has been refunded."
  } else if (role === 'buyer' && outcome === 'won') {
    detail = 'The dispute was resolved in your favor. You have been refunded by Stripe.'
  } else {
    detail = "The dispute was resolved in the seller's favor. The seller's payout has been released."
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Dispute resolved - ${listingTitle}`,
    html: emailHtml({
      preheader: `The dispute on ${listingTitle} has been resolved.`,
      body: `
        ${greeting(name)}
        ${bodyText(`The dispute on <strong>${listingTitle}</strong> has been resolved.`)}
        ${divider()}
        ${bodyText(detail)}
      `,
      ctaLabel: 'View Dashboard',
      ctaUrl: `${BASE_URL}/listings`,
    }),
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
    html: emailHtml({
      preheader: `${buyerName} made an offer respond within 48 hours.`,
      body: `
        ${greeting(sellerName)}
        ${bodyText(`You received a new offer on <strong>${listingTitle}</strong>.`)}
        ${divider()}
        ${metaTable(
          metaRow('From', buyerName) +
          metaRow('Offer', fmt(amountCents)) +
          metaRow('Asking price', fmt(askingPriceCents)) +
          (pct !== null ? metaRow('Offer %', `${pct}% of asking`) : '')
        )}
        ${bodyText('Log in to accept, decline, or counter the offer. <strong>Offers expire in 48 hours.</strong>')}
      `,
      ctaLabel: 'Respond to Offer',
      ctaUrl: `${BASE_URL}/sell`,
    }),
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
    accept: `Offer accepted - ${listingTitle}`,
    decline: `Offer declined - ${listingTitle}`,
    counter: `Counter-offer received - ${listingTitle}`,
    cancel: `Offer cancelled - ${listingTitle}`,
  }
  const ctaLabels: Record<string, string> = {
    accept: 'Complete Purchase',
    decline: 'Browse Listings',
    counter: 'View Counter-Offer',
    cancel: 'Browse Listings',
  }
  return resend.emails.send({
    from: FROM,
    to,
    subject: subjects[action],
    html: emailHtml({
      preheader: subjects[action],
      body: `
        ${greeting(name)}
        ${bodyText(messages[action])}
      `,
      ctaLabel: ctaLabels[action],
      ctaUrl: `${BASE_URL}/listings`,
    }),
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
    subject: `Payout released - ${listingTitle}`,
    html: emailHtml({
      preheader: `${fmt(payoutCents)} is on its way to your bank account.`,
      body: `
        ${greeting(sellerName)}
        ${bodyText(`Your payout for <strong>${listingTitle}</strong> has been released to your connected Stripe account.`)}
        ${divider()}
        ${metaTable(
          metaRow('Item', listingTitle) +
          metaRow('Payout amount', fmt(payoutCents)) +
          metaRow('Arrival', '2 to 5 business days')
        )}
      `,
      ctaLabel: 'View Seller Dashboard',
      ctaUrl: `${BASE_URL}/sell`,
    }),
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
    html: emailHtml({
      preheader: `${dealerName} invited you to their team expires in 7 days.`,
      body: `
        ${bodyText(`You've been invited to join <strong>${dealerName}</strong>'s team on Pedigree Coins as a <strong>${role}</strong>.`)}
        ${divider()}
        ${bodyText("Click the button below to accept your invitation. It expires in <strong>7 days</strong>.")}
        ${bodyText("If you don't have an account yet, you'll be able to create one after clicking the link.")}
      `,
      ctaLabel: 'Accept Invitation',
      ctaUrl: inviteUrl,
    }),
  })
}
