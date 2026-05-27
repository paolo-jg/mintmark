import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const val = match[2].trim().replace(/^["']|["']$/g, '')
    process.env[key] = val
  }
}

const require = createRequire(import.meta.url)
const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)
const TO = 'paolo@tryzyp.com'
const FROM = 'Pedigree Coins <no-reply@pedigreecoins.com>'
const BASE_URL = 'https://pedigreecoins.com'

function fmt(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function greeting(name) {
  return `<p style="margin:0 0 4px;color:#71717a;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Hello,</p>
<h1 style="margin:0 0 24px;color:#18181b;font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${name}</h1>`
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />`
}

function bodyText(text) {
  return `<p style="margin:0 0 16px;color:#3f3f46;font-size:15px;line-height:1.7;">${text}</p>`
}

function metaRow(label, value) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#71717a;font-size:13px;white-space:nowrap;padding-right:24px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-size:13px;font-weight:600;">${value}</td>
  </tr>`
}

function metaTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">${rows}</table>`
}

function emailHtml({ preheader, body, ctaLabel, ctaUrl }) {
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
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${BASE_URL}/logo-horizontal.png" alt="Pedigree Coins" height="36" style="display:block;height:36px;width:auto;" />
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;padding:40px 40px 36px;">
              ${body}
              ${cta}
            </td>
          </tr>
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

async function send(label, payload) {
  try {
    const result = await resend.emails.send(payload)
    if (result.error) {
      console.error(`  ✗ ${label}: ${result.error.message}`)
    } else {
      console.log(`  ✓ ${label}: ${result.data.id}`)
    }
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`)
  }
}

const FAKE_ORDER_ID = 'a1b2c3d4e5f6789012345678'
const FAKE_LISTING = '1881-S Morgan Dollar MS65'
const NAME = 'Paolo'

console.log(`\nSending test emails to ${TO}...\n`)

await send('Welcome (Buyer)', {
  from: FROM, to: TO,
  subject: '[TEST] Welcome to Pedigree Coins',
  html: emailHtml({
    preheader: "Welcome to Pedigree Coins. We're glad you're here.",
    body: `
      ${greeting(NAME)}
      ${bodyText("We're so glad you're here. Welcome to <strong>Pedigree Coins</strong>, a marketplace built for collectors and enthusiasts who care about the coins they buy and sell.")}
      ${bodyText("Whether you're hunting for a specific date and mintmark, building a type set, or just getting started, you'll find a curated selection of coins from sellers who share your passion.")}
      ${divider()}
      ${bodyText("Take a look around, save coins you love, and don't hesitate to make an offer. If you ever have a question, just reply to this email. We're always happy to help.")}
    `,
    ctaLabel: 'Start Browsing',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Welcome (Seller)', {
  from: FROM, to: TO,
  subject: "[TEST] You're ready to sell on Pedigree Coins",
  html: emailHtml({
    preheader: 'Your seller account is active. Create your first listing.',
    body: `
      ${greeting(NAME)}
      ${bodyText('Your seller account is fully set up. You can now create listings and receive payouts directly to your connected bank account.')}
      ${divider()}
      ${metaTable(
        metaRow('Payout timing', '48 hours after delivery confirmed') +
        metaRow('Shipping', 'Mark orders shipped promptly to keep buyers happy')
      )}
      ${bodyText("Your payout is released automatically 48 hours after the buyer's order is confirmed delivered. No action needed on your end once it ships.")}
      ${bodyText('By listing on Pedigree Coins, you certify that every coin you sell is authentic and accurately described. Misrepresentation may result in account suspension and dispute liability.')}
    `,
    ctaLabel: 'Go to Seller Dashboard',
    ctaUrl: `${BASE_URL}/sell`,
  }),
})

await send('Order Confirmation (Buyer)', {
  from: FROM, to: TO,
  subject: `[TEST] Order confirmed - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Your order for ${FAKE_LISTING} is confirmed.`,
    body: `
      ${greeting(NAME)}
      ${bodyText('Your order has been confirmed and payment is held in escrow.')}
      ${divider()}
      ${metaTable(
        metaRow('Item', FAKE_LISTING) +
        metaRow('Total', fmt(45000)) +
        metaRow('Order', `#${FAKE_ORDER_ID.slice(0, 8).toUpperCase()}`) +
        metaRow('Status', 'Awaiting shipment')
      )}
      ${bodyText("Your payment is secure and will only be released to the seller once you've confirmed delivery.")}
    `,
    ctaLabel: 'View Order',
    ctaUrl: `${BASE_URL}/orders/${FAKE_ORDER_ID}`,
  }),
})

await send('New Order (Seller)', {
  from: FROM, to: TO,
  subject: `[TEST] You made a sale - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `${FAKE_LISTING} sold! Ship it to unlock your payout.`,
    body: `
      ${greeting(NAME)}
      ${bodyText("Congratulations you made a sale! Ship the item as soon as possible to keep buyers happy.")}
      ${divider()}
      ${metaTable(
        metaRow('Item', FAKE_LISTING) +
        metaRow('Payout', fmt(42750)) +
        metaRow('Order', `#${FAKE_ORDER_ID.slice(0, 8).toUpperCase()}`) +
        metaRow('Status', 'Awaiting shipment from you')
      )}
      ${bodyText('Your payout is held in escrow and released 48 hours after the buyer confirms delivery.')}
    `,
    ctaLabel: 'Ship This Order',
    ctaUrl: `${BASE_URL}/sell`,
  }),
})

await send('Offer Received', {
  from: FROM, to: TO,
  subject: `[TEST] New offer on ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Alex M. made an offer. Respond within 48 hours.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`You received a new offer on <strong>${FAKE_LISTING}</strong>.`)}
      ${divider()}
      ${metaTable(
        metaRow('From', 'Alex M.') +
        metaRow('Offer', fmt(38000)) +
        metaRow('Asking price', fmt(45000)) +
        metaRow('Offer %', '84% of asking')
      )}
      ${bodyText('Log in to accept, decline, or counter the offer. <strong>Offers expire in 48 hours.</strong>')}
    `,
    ctaLabel: 'Respond to Offer',
    ctaUrl: `${BASE_URL}/sell`,
  }),
})

await send('Offer Responded. Accepted', {
  from: FROM, to: TO,
  subject: `[TEST] Offer accepted - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Offer accepted - ${FAKE_LISTING}`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your offer of <strong>${fmt(38000)}</strong> on <strong>${FAKE_LISTING}</strong> was accepted! Proceed to checkout to complete your purchase.`)}
    `,
    ctaLabel: 'Complete Purchase',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Offer Responded. Declined', {
  from: FROM, to: TO,
  subject: `[TEST] Offer declined - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Offer declined - ${FAKE_LISTING}`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your offer of <strong>${fmt(38000)}</strong> on <strong>${FAKE_LISTING}</strong> was declined by the seller.`)}
    `,
    ctaLabel: 'Browse Listings',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Offer Responded. Counter', {
  from: FROM, to: TO,
  subject: `[TEST] Counter-offer received - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Counter-offer received - ${FAKE_LISTING}`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`The seller countered your offer of <strong>${fmt(38000)}</strong> on <strong>${FAKE_LISTING}</strong> with <strong>${fmt(41500)}</strong>. Log in to respond.`)}
    `,
    ctaLabel: 'View Counter-Offer',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Offer Responded. Cancelled', {
  from: FROM, to: TO,
  subject: `[TEST] Offer cancelled - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `Offer cancelled - ${FAKE_LISTING}`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your offer of <strong>${fmt(38000)}</strong> on <strong>${FAKE_LISTING}</strong> has been cancelled.`)}
    `,
    ctaLabel: 'Browse Listings',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Shipping Update', {
  from: FROM, to: TO,
  subject: `[TEST] Your order has shipped - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `USPS has your package. Track it here.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your order for <strong>${FAKE_LISTING}</strong> is on its way.`)}
      ${divider()}
      ${metaTable(
        metaRow('Item', FAKE_LISTING) +
        metaRow('Carrier', 'USPS') +
        metaRow('Tracking', '9400111899223397485123')
      )}
    `,
    ctaLabel: 'Track Package',
    ctaUrl: 'https://tools.usps.com/go/TrackConfirmAction',
  }),
})

await send('Shipping Reminder', {
  from: FROM, to: TO,
  subject: `[TEST] Reminder: ship your order - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: 'Your buyer is waiting. Please ship as soon as possible.',
    body: `
      ${greeting(NAME)}
      ${bodyText(`This is a reminder that your order for <strong>${FAKE_LISTING}</strong> is still waiting to be shipped.`)}
      ${bodyText('Buyers expect prompt shipping. Please ship as soon as possible and add a tracking number in your dashboard.')}
      ${divider()}
      ${metaTable(
        metaRow('Item', FAKE_LISTING) +
        metaRow('Order', `#${FAKE_ORDER_ID.slice(0, 8).toUpperCase()}`)
      )}
    `,
    ctaLabel: 'Go to Seller Dashboard',
    ctaUrl: `${BASE_URL}/sell`,
  }),
})

await send('Package Delivered', {
  from: FROM, to: TO,
  subject: `[TEST] Your order has been delivered - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: 'Package delivered. Confirm receipt to release funds.',
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your order for <strong>${FAKE_LISTING}</strong> has been marked as delivered.`)}
      ${bodyText("If everything looks good, no action is needed. The seller's funds release automatically in 48 hours.")}
      ${divider()}
      ${bodyText('<strong>Issue with your order?</strong> Open a dispute before the 48-hour window closes.')}
    `,
    ctaLabel: 'View Order',
    ctaUrl: `${BASE_URL}/orders`,
  }),
})

await send('Dispute Opened (Buyer)', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute opened - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `A dispute has been opened on ${FAKE_LISTING}.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`A dispute has been opened on your order for <strong>${FAKE_LISTING}</strong>.`)}
      ${divider()}
      ${bodyText('Our team and Stripe will review the case. Funds remain frozen until the dispute is resolved.')}
      ${bodyText('If you have additional information or documentation, reply to this email.')}
    `,
  }),
})

await send('Dispute Opened (Seller)', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute opened - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `A dispute has been opened on ${FAKE_LISTING}.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`A dispute has been opened on your sale for <strong>${FAKE_LISTING}</strong>.`)}
      ${divider()}
      ${bodyText('Your payout is frozen until the dispute is resolved. Stripe will review the case and contact you directly.')}
      ${bodyText('If you have additional information or documentation, reply to this email.')}
    `,
  }),
})

await send('Dispute Resolved. Seller Won', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute resolved - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `The dispute on ${FAKE_LISTING} has been resolved.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`The dispute on <strong>${FAKE_LISTING}</strong> has been resolved.`)}
      ${divider()}
      ${bodyText('The dispute was resolved in your favor. Your payout will be released shortly.')}
    `,
    ctaLabel: 'View Dashboard',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Dispute Resolved. Seller Lost', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute resolved - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `The dispute on ${FAKE_LISTING} has been resolved.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`The dispute on <strong>${FAKE_LISTING}</strong> has been resolved.`)}
      ${divider()}
      ${bodyText("The dispute was resolved in the buyer's favor. The buyer has been refunded.")}
    `,
    ctaLabel: 'View Dashboard',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Dispute Resolved. Buyer Won', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute resolved - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `The dispute on ${FAKE_LISTING} has been resolved.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`The dispute on <strong>${FAKE_LISTING}</strong> has been resolved.`)}
      ${divider()}
      ${bodyText('The dispute was resolved in your favor. You have been refunded by Stripe.')}
    `,
    ctaLabel: 'View Dashboard',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Dispute Resolved. Buyer Lost', {
  from: FROM, to: TO,
  subject: `[TEST] Dispute resolved - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `The dispute on ${FAKE_LISTING} has been resolved.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`The dispute on <strong>${FAKE_LISTING}</strong> has been resolved.`)}
      ${divider()}
      ${bodyText("The dispute was resolved in the seller's favor. The seller's payout has been released.")}
    `,
    ctaLabel: 'View Dashboard',
    ctaUrl: `${BASE_URL}/listings`,
  }),
})

await send('Payout Released', {
  from: FROM, to: TO,
  subject: `[TEST] Payout released - ${FAKE_LISTING}`,
  html: emailHtml({
    preheader: `${fmt(42750)} is on its way to your bank account.`,
    body: `
      ${greeting(NAME)}
      ${bodyText(`Your payout for <strong>${FAKE_LISTING}</strong> has been released to your connected Stripe account.`)}
      ${divider()}
      ${metaTable(
        metaRow('Item', FAKE_LISTING) +
        metaRow('Payout amount', fmt(42750)) +
        metaRow('Arrival', '2 to 5 business days')
      )}
    `,
    ctaLabel: 'View Seller Dashboard',
    ctaUrl: `${BASE_URL}/sell`,
  }),
})

await send('Team Invite', {
  from: FROM, to: TO,
  subject: "[TEST] You've been invited to join Pedigree Coins Dealers on Pedigree Coins",
  html: emailHtml({
    preheader: `Pedigree Coins Dealers invited you to their team. Expires in 7 days.`,
    body: `
      ${bodyText("You've been invited to join <strong>Pedigree Coins Dealers</strong>'s team on Pedigree Coins as a <strong>admin</strong>.")}
      ${divider()}
      ${bodyText("Click the button below to accept your invitation. It expires in <strong>7 days</strong>.")}
      ${bodyText("If you don't have an account yet, you'll be able to create one after clicking the link.")}
    `,
    ctaLabel: 'Accept Invitation',
    ctaUrl: `${BASE_URL}/invite/test-token-abc123`,
  }),
})

console.log('\nDone.\n')
