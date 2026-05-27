export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Pedigree Coins',
  description: 'Terms of Service, Sellers Agreement, and Buyers Agreement for Pedigree Coins.',
}

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-1">Terms of Service, Sellers Agreement, and Buyers Agreement</p>
      <p className="text-sm text-muted-foreground mb-6">
        Effective Date: May 26, 2026 · Last Updated: May 28, 2026
      </p>

      <div className="bg-muted/40 border border-border rounded-xl p-5 mb-10 text-sm leading-relaxed">
        <p>
          These Terms of Service (together with the Sellers Agreement and the Buyers Agreement set out
          in Sections 6 and 7, the &ldquo;Terms&rdquo;) are a binding contract between you and Pedigree Coins, Inc.,
          a Delaware corporation with a notice address at 111 Quad Drive, Easton, Pennsylvania 18042,
          United States (&ldquo;Pedigree Coins&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), governing your access to and use of
          the website located at pedigreecoins.com and all related applications, APIs, and services
          (collectively, the &ldquo;Platform&rdquo;).
        </p>
        <p className="mt-3 font-semibold text-foreground">
          PLEASE READ THESE TERMS CAREFULLY. THEY CONTAIN IMPORTANT PROVISIONS, INCLUDING A MANDATORY
          INDIVIDUAL ARBITRATION REQUIREMENT AND A CLASS ACTION WAIVER IN SECTION 15. BY CREATING AN
          ACCOUNT OR OTHERWISE USING THE PLATFORM, YOU AGREE TO BE BOUND BY THESE TERMS.
        </p>
        <p className="mt-3">
          If you do not agree to these Terms, do not create an account and do not use the Platform.
        </p>
      </div>

      <Section title="1. Acceptance of Terms">
        <Subsection title="1.1 Agreement to Be Bound">
          <p>
            By clicking &ldquo;I Agree,&rdquo; creating an account, listing an item, placing a bid or purchase, or
            otherwise accessing or using the Platform, you represent that you have read, understood, and
            agree to be bound by these Terms, by our{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
            , and by any additional policies referenced in or made available through the Platform
            (including the Acceptable Use Policy and the Plan terms published at pedigreecoins.com/pricing).
            All such policies are incorporated into these Terms by reference.
          </p>
        </Subsection>
        <Subsection title="1.2 Capacity to Contract">
          <p>
            You represent and warrant that you are at least 18 years of age and have the legal capacity
            to enter into a binding contract under the laws of your jurisdiction. The Platform is not
            directed to anyone under 18, and use by anyone under 18 is strictly prohibited.
          </p>
        </Subsection>
        <Subsection title="1.3 Updates to the Terms">
          <p>
            We may update these Terms from time to time as described in Section 17. Your continued use
            of the Platform after an update takes effect constitutes acceptance of the updated Terms.
          </p>
        </Subsection>
      </Section>

      <Section title="2. Definitions">
        <p>For purposes of these Terms:</p>
        <dl className="mt-3 space-y-2">
          {[
            ['"Account"', 'a registered user profile on the Platform.'],
            ['"Auction Hold"', 'a Stripe payment authorization hold placed on a Bidder\'s saved payment method at the time a bid is placed in a live auction, as described in Section 6.16.'],
            ['"Buyer"', 'a User who purchases or offers to purchase a Listing from a Seller.'],
            ['"Buyer Fee"', 'the per-transaction fee charged to a Buyer as published at pedigreecoins.com/pricing.'],
            ['"Coin"', 'a physical, government-issued or historically circulated numismatic coin offered or sold through the Platform.'],
            ['"Confirmation Window"', 'the 48-hour period following a Buyer\'s in-app confirmation of receipt, during which a Dispute may be filed and after which Escrowed Funds are released to the Seller.'],
            ['"Dispute"', 'a formal complaint filed by a Buyer through the Platform\'s in-app dispute system asserting a problem with a Transaction, as described in Section 7.5.'],
            ['"Escrowed Funds"', 'amounts collected by Pedigree Coins (through Stripe) from a Buyer in respect of a Transaction and held in the platform\'s Stripe account pending release pursuant to Section 6.8.'],
            ['"Listing"', 'an offer to sell a Coin posted to the Platform by a Seller.'],
            ['"Plan"', 'a paid subscription tier selected by a Seller during onboarding as published at pedigreecoins.com/pricing.'],
            ['"Seller"', 'a User who lists Coins for sale through the Platform.'],
            ['"Seller Fee"', 'the per-transaction fee charged to a Seller as published at pedigreecoins.com/pricing.'],
            ['"Stripe"', 'Stripe, Inc. and its affiliates, including Stripe Connect.'],
            ['"Transaction"', 'a sale of a Listing through the Platform.'],
            ['"User"', 'any person who creates an Account or otherwise uses the Platform, including Buyers and Sellers.'],
          ].map(([term, def]) => (
            <div key={term} className="flex gap-2">
              <dt className="font-medium text-foreground shrink-0">{term}</dt>
              <dd className="text-muted-foreground">means {def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="3. Eligibility, Account Registration, and Onboarding">
        <Subsection title="3.1 Eligibility">
          <p>
            To use the Platform you must (a) be at least 18 years of age; (b) have full legal capacity
            to contract under the laws of your country of residence; (c) not be located in, organized
            under the laws of, or ordinarily resident in any country or region subject to comprehensive
            U.S. sanctions administered by OFAC; and (d) not appear on the U.S. Specially Designated
            Nationals List, the U.S. Denied Persons List, or any equivalent restricted-party list.
          </p>
        </Subsection>
        <Subsection title="3.2 Registration">
          <p>
            To register, you must provide accurate and complete information, including a valid email
            address, legal name, and (for Sellers) a billing address and tax identification information.
            You are responsible for keeping this information current and for safeguarding your password
            and account credentials. You are responsible for all activity that occurs under your Account.
          </p>
        </Subsection>
        <Subsection title="3.3 Onboarding Steps">
          <p>Before you may list, sell, or purchase through the Platform, you must complete onboarding, which consists of:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>electronic acceptance of these Terms and the Privacy Policy;</li>
            <li>selection of a username and display name;</li>
            <li>for Sellers, selection of a Plan published at pedigreecoins.com/pricing;</li>
            <li>for Sellers, successful completion of KYC verification (for individuals) or KYB verification (for entities), conducted by Stripe as part of Stripe Connect account onboarding; and</li>
            <li>for Sellers, creation of a Stripe Connect account and linkage of a valid bank account capable of receiving payouts.</li>
          </ul>
        </Subsection>
        <Subsection title="3.4 Verification">
          <p>
            We may, at our sole discretion and at any time, require additional verification of your
            identity, business, address, payment instruments, source of funds, or right to sell any
            Listing. We may suspend or restrict your Account pending the outcome of any such verification.
          </p>
        </Subsection>
        <Subsection title="3.5 One Account per Person or Entity">
          <p>
            Unless we expressly authorize otherwise in writing, each person or entity may maintain only
            one Account. We may close duplicate Accounts.
          </p>
        </Subsection>
      </Section>

      <Section title="4. Plans, Fees, Billing, and Taxes">
        <Subsection title="4.1 Plans and Plan Fees">
          <p>
            Sellers must select a Plan during onboarding. The Plans available, the features included in
            each Plan, and the subscription prices are published at pedigreecoins.com/pricing and are
            incorporated into these Terms by reference. The current Plans are:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Collector Basic</strong> — Free; 7% buyer fee; 7% seller fee; $0.50 per listing; up to 10 active listings/month; unlimited purchases.</li>
            <li><strong>Collector Premium</strong> — $9.99/month; 1.9% buyer fee; 1.9% seller fee; $0.40 per listing; up to 50 active listings/month; unlimited purchases.</li>
            <li><strong>Dealer</strong> — $49.99/month; 1% buyer fee; 0% seller fee; $0 per listing; unlimited listings; unlimited purchases.</li>
          </ul>
          <p className="mt-2">Pedigree Coins may change Plan pricing or features at any time on notice as described in Section 17.</p>
        </Subsection>
        <Subsection title="4.2 Monthly Listing Quota">
          <p>
            Each Plan carries a monthly active-listing quota as described in Section 4.1. Listings count
            toward the quota in the calendar month in which they are created, regardless of their current
            status. Relisted items (see Section 6.6(h)) count as new listings in the month of relisting.
            Unused slots do not roll over.
          </p>
        </Subsection>
        <Subsection title="4.3 Transaction Fees">
          <p>
            For each completed Transaction, Pedigree Coins charges a Buyer Fee to the Buyer and a Seller
            Fee to the Seller at the rate published at pedigreecoins.com/pricing for the applicable Plan
            tier. Pedigree Coins may change any fee at any time on notice as described in Section 17;
            the fee in effect at the time a Listing is created governs that Listing.
          </p>
        </Subsection>
        <Subsection title="4.4 Payment Processing Fees">
          <p>
            Payments are processed by Stripe. Stripe charges its own processing fees (approximately
            2.9% + $0.30 per card transaction in the U.S., with separate rates for ACH, international
            cards, and currency conversion). Stripe processing fees are deducted from amounts collected
            from the Buyer and are not absorbed by Pedigree Coins.
          </p>
        </Subsection>
        <Subsection title="4.5 Billing and Auto-Renewal">
          <p>
            Subscription Plans are billed in advance on a monthly or annual cycle and automatically
            renew until cancelled. You may cancel auto-renewal at any time through your Account settings;
            cancellation takes effect at the end of the then-current paid period. No refunds are issued
            for partial periods, unused listings, or unused features.
          </p>
        </Subsection>
        <Subsection title="4.6 Failed Payments and Suspension">
          <p>
            If a subscription charge fails, we may suspend Plan benefits until the charge is successfully
            processed. Repeated failed payments may result in termination of the Account.
          </p>
        </Subsection>
        <Subsection title="4.7 Taxes">
          <p><strong>(a) Income Taxes.</strong> Each Seller is solely responsible for determining, reporting, and paying all income, self-employment, business, and similar taxes that arise from their use of the Platform.</p>
          <p className="mt-2"><strong>(b) Information Reporting (1099-K).</strong> Stripe will issue IRS Form 1099-K to U.S. Sellers at the thresholds set by U.S. federal law. Non-U.S. Sellers must provide a valid IRS Form W-8BEN, W-8BEN-E, or other applicable certification during onboarding.</p>
          <p className="mt-2"><strong>(c) Sales Tax, VAT, and GST.</strong> Pedigree Coins acts as the marketplace facilitator for transaction taxes in every jurisdiction where the law obligates a marketplace facilitator to do so. In those jurisdictions, Pedigree Coins (through Stripe Tax) calculates, collects, and remits the applicable tax at checkout.</p>
          <p className="mt-2"><strong>(d) Tax Information Accuracy.</strong> Each Seller must provide and keep current accurate tax information through Stripe Connect. Failure to do so may result in backup withholding or Account suspension.</p>
        </Subsection>
      </Section>

      <Section title="5. The Marketplace; Role of Pedigree Coins">
        <Subsection title="5.1 Marketplace Only">
          <p>
            The Platform is an online marketplace that enables third-party Sellers to list Coins for
            sale and Buyers to purchase those Coins. Pedigree Coins is not a party to any sale between
            a Seller and a Buyer. Pedigree Coins does not buy, own, hold inventory of, take title to,
            possess, ship, authenticate, grade, appraise, value, or guarantee any Coin sold or offered
            on the Platform.
          </p>
        </Subsection>
        <Subsection title="5.2 No Authenticity, Grade, or Quality Guarantee">
          <p>
            Pedigree Coins does not authenticate, grade, appraise, certify, or guarantee the genuineness,
            condition, attribution, provenance, grade, value, or accuracy of any Listing. Any third-party
            grading or authentication references included in a Listing are provided by the Seller, not
            by Pedigree Coins.
          </p>
        </Subsection>
        <Subsection title="5.3 Risk of Loss in Transit; No Delivery Guarantee">
          <p>
            Risk of loss passes from the Seller to the Buyer upon the carrier&rsquo;s delivery to the Buyer&rsquo;s
            shipping address. Pedigree Coins does not guarantee that a Coin will be delivered, will
            arrive on time, will arrive undamaged, will match the Listing description, or will be
            authentic.
          </p>
        </Subsection>
        <Subsection title="5.4 Limited In-Platform Dispute Resolution">
          <p>
            Pedigree Coins provides an in-platform dispute resolution process (described in Section 7.5)
            as a convenience to Users. When a Buyer files a Dispute, Pedigree Coins will review the
            available information and make an administrative determination to either release Escrowed
            Funds to the Seller or issue a refund to the Buyer. This determination is made solely to
            resolve the disposition of Escrowed Funds and does not constitute adjudication of any legal
            claim, finding of fact, or legal ruling. Pedigree Coins&rsquo;s determination is not a
            substitute for legal remedies and does not prevent either party from pursuing other
            available remedies, including arbitration under Section 15.
          </p>
        </Subsection>
        <Subsection title="5.5 Independent Contractor">
          <p>
            Each Seller is an independent contractor and not an employee, agent, partner, joint venturer,
            or franchisee of Pedigree Coins.
          </p>
        </Subsection>
      </Section>

      <Section title="6. Sellers Agreement">
        <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 mb-4 text-sm text-muted-foreground">
          This Section 6 applies to every User who lists a Coin for sale on the Platform. By creating
          a Listing or completing Seller onboarding, you agree to this Sellers Agreement in addition
          to the rest of these Terms.
        </div>

        <Subsection title="6.1 Becoming a Seller">
          <p>
            To become a Seller, you must complete all onboarding steps in Section 3.3, including
            selection of a Plan, completion of KYC or KYB through Stripe Connect, and linkage of a
            valid bank account capable of receiving payouts.
          </p>
        </Subsection>
        <Subsection title="6.2 Listings: Accuracy and Photographs">
          <p><strong>(a) Accuracy.</strong> Every Listing must be a truthful, complete, and accurate description of the Coin offered, including its denomination, year, mint mark, condition, any grade or attribution claimed, any damage or alteration, and the basis for any provenance representation.</p>
          <p className="mt-2"><strong>(b) Photographs.</strong> Every Listing must include clear, in-focus, color photographs of the actual Coin being sold. Photographs must show both the obverse and reverse. For graded Coins in third-party holders (e.g., PCGS or NGC slabs), photographs must show the holder label, including the certification number, legibly.</p>
          <p className="mt-2"><strong>(c) Title.</strong> You represent and warrant that you own the Coin (or have the legal right to sell it), that the Coin is free of all liens and encumbrances, and that the sale will convey good and marketable title.</p>
        </Subsection>
        <Subsection title="6.3 Authenticity Warranty by Seller">
          <p>
            You represent and warrant to Pedigree Coins and to each Buyer that every Coin you list is
            genuine, and that any third-party grade, attribution, or certification referenced in the
            Listing is accurate as of the time of Listing. The sale of a counterfeit, replica,
            reproduction, altered, or misattributed Coin is a material breach of these Terms and may
            result in immediate suspension, refund, and permanent termination.
          </p>
        </Subsection>
        <Subsection title="6.4 Prohibited Items">
          <p>You must not list, offer, or sell:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Counterfeit, replica, reproduction, restrike, or fantasy coins unless prominently and unambiguously labeled as such in compliance with the U.S. Hobby Protection Act;</li>
            <li>Coins originating in or shipped from any country subject to comprehensive U.S. sanctions, or any coin reasonably believed to have been stolen, looted, or illegally excavated;</li>
            <li>Non-coin items, including bullion bars, ingots, rounds (other than government-issued), banknotes, jewelry, exonumia, or souvenirs; and</li>
            <li>Cryptocurrency, digital tokens, NFTs, fractional or tokenized ownership interests in coins, or any other digital asset or financial instrument.</li>
          </ul>
        </Subsection>
        <Subsection title="6.5 Pricing, Fees, and Amounts Owed">
          <p>
            On each completed Transaction, the Seller owes Pedigree Coins (i) the Seller Fee, (ii) any
            per-listing flat fee under the applicable Plan, and (iii) reimbursement of any Stripe
            processing fees, refunds, chargebacks, or currency conversion fees attributable to that
            Transaction. These amounts are deducted from Escrowed Funds before payout.
          </p>
        </Subsection>
        <Subsection title="6.6 Shipping Requirements">
          <p><strong>(a) Seller-Arranged Shipping.</strong> Sellers are responsible for arranging and paying for their own shipping labels through any carrier of their choice. Pedigree Coins does not provide, require, or endorse any specific shipping carrier or label service.</p>
          <p className="mt-2"><strong>(b) Tracked Shipping Required.</strong> All shipments must carry a valid carrier tracking number. The Seller must enter the tracking number and carrier into the Platform within the dispatch window. Pedigree Coins will not release Escrowed Funds to a Seller until a tracking number has been recorded in the Platform.</p>
          <p className="mt-2"><strong>(c) Signature Confirmation on Orders of US $250 or More.</strong> The Seller must select a shipping service requiring carrier signature confirmation at delivery.</p>
          <p className="mt-2"><strong>(d) Insured Shipping for Orders of US $500 or More.</strong> The Seller must ship with declared-value carrier insurance covering the full sale price, or via an equivalent insured secured-carrier service such as USPS Registered Mail.</p>
          <p className="mt-2"><strong>(e) Pedigree Coins Hand-Delivery for Orders over US $500,000.</strong> Seller and Buyer may elect hand-delivery by a Pedigree Coins representative at a flat fee of US $5,000 for delivery within the fifty United States.</p>
          <p className="mt-2"><strong>(f) Dispatch Window.</strong> Sellers must dispatch the Coin and enter a tracking number into the Platform within <strong>five (5) calendar days</strong> of payment authorization.</p>
          <p className="mt-2"><strong>(g) Auto-Cancellation for Non-Dispatch.</strong> If a Seller has not entered a valid tracking number within five (5) calendar days of payment authorization, the Platform will automatically cancel the order and issue a full refund to the Buyer. Upon auto-cancellation: (i) the Transaction is voided; (ii) the Listing moves to &ldquo;Expired&rdquo; status; (iii) the Listing continues to count toward the Seller&rsquo;s monthly quota; and (iv) the Listing is not automatically relisted. The Seller bears any Stripe processing or currency-conversion costs associated with the refund.</p>
          <p className="mt-2"><strong>(h) Relisting Expired Listings.</strong> A Seller may choose to relist any Listing in &ldquo;Expired&rdquo; or &ldquo;Sold&rdquo; status by creating a new draft copy through the Platform. Each relist creates a new Listing and counts as a new listing against the Seller&rsquo;s monthly quota in the calendar month of relisting.</p>
          <p className="mt-2"><strong>(i) No Cancellation After Dispatch.</strong> Once a Seller has entered a tracking number, the Transaction is final and cannot be cancelled by either party except through the in-platform Dispute process. All sales are final once shipped.</p>
          <p className="mt-2"><strong>(j) Consequences of Non-Compliance.</strong> If a Seller ships in violation of any requirement of this Section 6.6 and the Coin is lost, stolen, damaged, or not delivered, the Seller bears 100% of the resulting loss.</p>
        </Subsection>
        <Subsection title="6.7 All Sales Final — No Returns">
          <p>
            <strong>All sales on the Platform are final. Pedigree Coins operates a strict no-return, no-exchange policy platform-wide.</strong> Sellers are not required to accept returns, and Buyers may not demand them. This policy applies to all Listings regardless of condition, grade, or price.
          </p>
          <p className="mt-2">
            The sole exception is a Coin that is counterfeit, a replica, or materially misattributed and was not disclosed as such in the Listing. Such a Coin is returnable for a full refund of the purchase price, original shipping, return shipping, and any associated fees, subject to the Dispute process in Section 7.5.
          </p>
          <p className="mt-2">
            Buyers are encouraged to review Listing photographs, grading service certification records, and population reports carefully before purchasing. The no-return policy is a core condition of every Transaction on the Platform.
          </p>
        </Subsection>
        <Subsection title="6.8 Payouts and Escrow">
          <p><strong>(a) Platform Escrow.</strong> Upon successful payment, gross Transaction proceeds are held in Pedigree Coins&rsquo; Stripe account (&ldquo;Escrow&rdquo;). Funds are not transferred to the Seller&rsquo;s Stripe Connect balance until the release conditions in Section 6.8(b) or (c) are met.</p>
          <p className="mt-2"><strong>(b) Payout Requires Tracking Number.</strong> No payout will be released to a Seller until a valid carrier tracking number has been entered in the Platform. This is a hard prerequisite and cannot be waived.</p>
          <p className="mt-2"><strong>(c) Auto-Release.</strong> Fourteen (14) calendar days after the Seller enters a tracking number, Escrowed Funds are released to the Seller automatically, provided no Dispute is open. This auto-release date is displayed on the order detail page and serves as the outer boundary of the Buyer&rsquo;s dispute window.</p>
          <p className="mt-2"><strong>(d) Early Release on Buyer Confirmation.</strong> A Buyer may confirm receipt through the Platform at any time after a tracking number is entered. Upon confirmation, a <strong>48-hour Confirmation Window</strong> begins. If no Dispute is filed within that window, Escrowed Funds are released to the Seller at the end of the 48-hour period. Confirming receipt acknowledges that the Coin has arrived; Buyers should inspect the Coin before confirming.</p>
          <p className="mt-2"><strong>(e) Dispute Window Summary.</strong> A Buyer&rsquo;s right to file an in-platform Dispute expires at the earlier of: (i) 48 hours after the Buyer confirms receipt, or (ii) 14 calendar days after the Seller enters a tracking number. After either deadline, Escrowed Funds are released and Disputes are not eligible for in-platform resolution.</p>
          <p className="mt-2"><strong>(f) Hold Extensions.</strong> Pedigree Coins may extend the hold where a Dispute is under active investigation, where the Transaction is being reviewed for suspected fraud, or as required by applicable law.</p>
          <p className="mt-2"><strong>(g) In-Platform Disputes.</strong> If a Buyer files a Dispute before the dispute window closes, Escrowed Funds are immediately frozen and will not be released to the Seller pending resolution. Pedigree Coins will review the Dispute and, at its sole discretion, either (i) release Escrowed Funds to the Seller or (ii) issue a refund to the Buyer. Pedigree Coins aims to resolve Disputes within two (2) business days of receipt but makes no guarantee as to timing.</p>
          <p className="mt-2"><strong>(h) Chargebacks.</strong> If a Buyer initiates a chargeback through their payment provider or card issuer, Escrowed Funds are frozen pending resolution by Stripe and the card network. Buyers are strongly encouraged to use the in-platform Dispute process before initiating a chargeback.</p>
        </Subsection>
        <Subsection title="6.9 Chargebacks and Reversals">
          <p>
            If a Buyer initiates a chargeback or reversal, the Seller bears 100% of the resulting loss,
            including the disputed amount, any Stripe chargeback fee, and related costs. Pedigree Coins
            will freeze escrowed funds and apply them toward the disputed amount, and may invoice the
            Seller directly for amounts unpaid.
          </p>
        </Subsection>
        <Subsection title="6.10 Seller Performance Standards">
          <p>
            Pedigree Coins may suspend, restrict, demote, or terminate the Account of any Seller whose
            performance metrics fall below published thresholds, including on-time dispatch rate,
            tracking-upload rate, cancellation rate, chargeback rate, or Buyer review score.
          </p>
        </Subsection>
        <Subsection title="6.11 Seller Tax Information">
          <p>
            Each Seller must provide accurate and current tax information through Stripe Connect
            onboarding (IRS Form W-9 for U.S. Sellers; IRS Form W-8BEN, W-8BEN-E, or other applicable
            certification for non-U.S. Sellers). Failure to do so may result in backup withholding,
            suspension of payouts, or termination.
          </p>
        </Subsection>
        <Subsection title="6.12 Listing Content; Intellectual Property License from Seller">
          <p>
            Sellers retain all right, title, and interest in the content they upload to the Platform.
            Each Seller grants Pedigree Coins a non-exclusive, worldwide, royalty-free, sublicensable,
            transferable, perpetual, and irrevocable license to host, store, reproduce, modify, publicly
            display, distribute, and create derivative works of that content in any media for any
            purpose related to the operation, promotion, or improvement of the Platform. The license
            survives expiration of the Listing, termination of the Account, and termination of these Terms.
          </p>
        </Subsection>
        <Subsection title="6.13 Suspension and Termination of Seller Accounts">
          <p>
            Pedigree Coins may suspend or terminate a Seller&rsquo;s Account at any time, including for
            breach of these Terms, suspected fraud or money laundering, listing of a Prohibited Item,
            repeated Buyer complaints, or failure to maintain accurate KYC/KYB or tax information.
            Subscription fees paid before suspension or termination are not refunded.
          </p>
        </Subsection>
        <Subsection title="6.14 Seller Indemnification">
          <p>
            Each Seller agrees to defend, indemnify, and hold harmless Pedigree Coins and its officers,
            directors, employees, agents, and affiliates from and against any claim, loss, liability,
            cost, or expense arising out of: (a) the Listing, sale, shipment, or authenticity of any
            Coin; (b) any breach of these Terms or any representation herein; (c) any chargeback or
            dispute; (d) any violation of applicable law; and (e) any infringement of third-party
            intellectual property, publicity, or privacy rights by Seller Content.
          </p>
        </Subsection>
        <Subsection title="6.15 Referral Program">
          <p>
            Pedigree Coins may offer a referral program under which a Seller earns a credit or reward
            when a referred user completes account registration and, where applicable, their first
            Transaction. Referral terms, credit amounts, expiry dates, and eligibility criteria are
            published on the Platform and may be changed or discontinued at any time. Credits have no
            cash value and are not transferable.
          </p>
        </Subsection>
        <Subsection title="6.16 Auction Payment Holds">
          <p><strong>(a) Authorization Hold at Bid Time.</strong> When a User places a bid in a live auction, Pedigree Coins places a Stripe payment authorization hold (&ldquo;Auction Hold&rdquo;) on the Bidder&rsquo;s saved payment method in the amount of the bid. The Bidder must have a saved payment method on file; bids without a valid payment method will be rejected.</p>
          <p className="mt-2"><strong>(b) Release on Outbid.</strong> If the Bidder is outbid, the Auction Hold is released automatically and no charge is made.</p>
          <p className="mt-2"><strong>(c) Capture on Win.</strong> If the Bidder wins the auction, the Auction Hold is captured (i.e., converted to a charge) and the Transaction proceeds as an ordinary fixed-price sale subject to all terms in this Section 6 and Section 7.</p>
          <p className="mt-2"><strong>(d) Reserve Not Met.</strong> If the auction ends without the reserve price being met, all Auction Holds are released and no Transaction occurs.</p>
          <p className="mt-2"><strong>(e) Anti-Sniping.</strong> If a bid is placed within the final 15 seconds of an auction, the auction end time is automatically extended by 15 seconds. This process may repeat until no bid is placed in the final 15-second window.</p>
          <p className="mt-2"><strong>(f) Bid Binding.</strong> Every bid is a binding commitment to purchase the Coin at the bid price, plus applicable fees and shipping, if that bid wins the auction. Bids may not be retracted.</p>
        </Subsection>
      </Section>

      <Section title="7. Buyers Agreement">
        <div className="bg-muted/30 border border-border rounded-lg px-4 py-3 mb-4 text-sm text-muted-foreground">
          This Section 7 applies to every User who places a bid, offer, or purchase order on the
          Platform. By placing any such bid, offer, or order, you agree to this Buyers Agreement in
          addition to the rest of these Terms.
        </div>

        <Subsection title="7.1 Becoming a Buyer">
          <p>
            To place a purchase order, you must complete the eligibility and registration steps in
            Section 3, including electronic acceptance of these Terms and the Privacy Policy.
          </p>
        </Subsection>
        <Subsection title="7.2 Purchases Are Binding">
          <p>
            Every purchase order, accepted offer, or winning auction bid is a binding agreement to
            purchase the Coin from the Seller at the listed or winning price, plus the Buyer Fee,
            applicable shipping charges, and applicable taxes. Once a Seller has entered a tracking
            number, the Transaction is final and cannot be cancelled by the Buyer except through the
            in-platform Dispute process.
          </p>
        </Subsection>
        <Subsection title="7.3 Payment">
          <p>
            Buyers must pay through Stripe using a payment method supported on the Platform. For
            auction purchases, Buyers must have a saved payment method on file before placing any bid
            (see Section 6.16). Upon successful authorization or capture, the Transaction proceeds are
            held as Escrowed Funds in the platform&rsquo;s Stripe account pending release pursuant to Section 6.8.
          </p>
        </Subsection>
        <Subsection title="7.4 Inspection and Receipt Confirmation">
          <p>
            Upon delivery, the Buyer should promptly inspect the Coin. If satisfied, the Buyer may
            confirm receipt through the Platform. Upon confirmation, a <strong>48-hour Confirmation Window</strong> begins,
            during which the Buyer may still file a Dispute. After the Confirmation Window closes,
            Escrowed Funds are released to the Seller and no in-platform Dispute may be filed.
          </p>
          <p className="mt-2">
            If the Buyer does not confirm receipt, Escrowed Funds will release automatically to the
            Seller <strong>14 calendar days after the Seller entered the tracking number</strong>, provided no Dispute
            is open. This auto-release date is displayed on the order detail page.
          </p>
          <p className="mt-2">
            <strong>Buyers should not confirm receipt before inspecting the Coin.</strong> Confirming receipt
            starts the 48-hour dispute clock. Filing a Dispute is the correct action if the Coin
            has not arrived, arrived damaged, or does not match the Listing.
          </p>
        </Subsection>
        <Subsection title="7.5 In-Platform Dispute Process">
          <p><strong>(a) How to File.</strong> If you have a problem with a Transaction (including non-delivery, item not as described, suspected counterfeit, or damage in transit), you must file a Dispute through the Platform before your dispute window closes. To file, navigate to the order detail page and click &ldquo;File a Dispute.&rdquo;</p>
          <p className="mt-2"><strong>(b) Dispute Window.</strong> The dispute window closes at the earlier of: (i) 48 hours after you confirm receipt, or (ii) 14 calendar days after the Seller entered the tracking number. The deadline is shown on your order detail page. Disputes filed after the window closes are not eligible for in-platform resolution.</p>
          <p className="mt-2"><strong>(c) Required Information.</strong> You must select a dispute reason and provide a written description of the problem. Pedigree Coins may request additional evidence, such as photographs or carrier documentation.</p>
          <p className="mt-2"><strong>(d) Fund Freeze.</strong> Upon submission of a Dispute, Escrowed Funds are immediately frozen and will not be released to the Seller while the Dispute is under review.</p>
          <p className="mt-2"><strong>(e) Review and Decision.</strong> Pedigree Coins will review the Dispute and aims to issue a determination within two (2) business days. Pedigree Coins may, at its sole discretion, (i) release Escrowed Funds to the Seller or (ii) refund the Buyer. Both parties will be notified of the outcome by email.</p>
          <p className="mt-2"><strong>(f) Finality.</strong> Pedigree Coins&rsquo;s determination governs the disposition of Escrowed Funds and is not subject to appeal within the Platform. Either party may pursue other remedies, including arbitration under Section 15.</p>
        </Subsection>
        <Subsection title="7.6 All Sales Final">
          <p>
            <strong>All purchases on the Platform are final.</strong> Pedigree Coins does not permit returns or exchanges
            except as expressly provided in Section 6.7 (counterfeit or materially misattributed Coins).
            By completing a purchase, the Buyer acknowledges this policy and waives any right to demand
            a return, exchange, or refund on any other grounds.
          </p>
        </Subsection>
        <Subsection title="7.7 No Guarantee of Authenticity, Quality, or Delivery">
          <p>
            The Buyer expressly acknowledges that Pedigree Coins does not authenticate, grade, appraise,
            certify, inspect, possess, or guarantee any Coin; that Pedigree Coins is not a carrier and
            does not guarantee delivery; and that all risk rests on the Buyer&rsquo;s diligence in evaluating
            the Listing and on the Seller&rsquo;s representations and warranties.
          </p>
        </Subsection>
        <Subsection title="7.8 Chargebacks">
          <p>
            Buyers are strongly encouraged to use the in-platform Dispute process (Section 7.5) before
            initiating a chargeback with their payment provider. Initiating a chargeback without first
            attempting in-platform resolution may result in suspension or termination of the Buyer&rsquo;s
            Account. Abusive or fraudulent chargebacks will result in permanent termination.
          </p>
        </Subsection>
        <Subsection title="7.9 Risk Acknowledgment">
          <p>
            The Buyer acknowledges that the numismatic market involves risks including authenticity
            risk, grading and attribution risk, market-value volatility, illiquidity, in-transit loss,
            and theft. The Buyer assumes those risks. Nothing on the Platform constitutes investment
            advice, and Coins are not securities or investment contracts.
          </p>
        </Subsection>
      </Section>

      <Section title="8. Acceptable Use; Prohibited Conduct">
        <p>You must not, and must not permit any third party to:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>use the Platform to violate any applicable law, regulation, sanctions program, or court order;</li>
          <li>list, buy, or sell any item prohibited under Section 6.4;</li>
          <li>misrepresent your identity, authority, tax residence, or KYC/KYB information;</li>
          <li>interfere with, disrupt, overload, or attempt to gain unauthorized access to the Platform or any system;</li>
          <li>use the Platform to launder money, finance terrorism, or evade sanctions;</li>
          <li>reverse-engineer, decompile, or scrape the Platform other than as expressly permitted in writing;</li>
          <li>circumvent any fee, including by communicating off-Platform to consummate a Transaction that originated on the Platform;</li>
          <li>post content that is unlawful, defamatory, harassing, threatening, obscene, infringing, or designed to deceive;</li>
          <li>shill-bid, manipulate auction end times (other than through legitimate bids triggering anti-sniping extension), post fake reviews, or otherwise manipulate the marketplace; or</li>
          <li>use the Platform on behalf of any person or entity prohibited from using the Platform under Section 3.1.</li>
        </ul>
      </Section>

      <Section title="9. Intellectual Property">
        <Subsection title="9.1 Platform IP">
          <p>
            All right, title, and interest in and to the Platform are owned by Pedigree Coins or its
            licensors. No license is granted to you except the limited, revocable, non-exclusive,
            non-transferable license to access and use the Platform in accordance with these Terms.
          </p>
        </Subsection>
        <Subsection title="9.2 Feedback">
          <p>
            Any feedback, suggestions, or ideas you provide to Pedigree Coins about the Platform are
            non-confidential, and Pedigree Coins may use them without restriction or compensation.
          </p>
        </Subsection>
        <Subsection title="9.3 DMCA">
          <p>
            Pedigree Coins responds to notices of alleged copyright infringement under the U.S. Digital
            Millennium Copyright Act (17 U.S.C. § 512). Notices must be sent to{' '}
            <a href="mailto:legal@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              legal@pedigreecoins.com
            </a>{' '}
            and must include the information required by 17 U.S.C. § 512(c)(3).
          </p>
        </Subsection>
      </Section>

      <Section title="10. Privacy and Messaging">
        <Subsection title="10.1 Privacy Policy">
          <p>
            Our collection and use of personal data is described in our{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
            , which is incorporated by reference.
          </p>
        </Subsection>
        <Subsection title="10.2 End-to-End Encrypted Messaging">
          <p>
            The Platform provides an in-app messaging feature between Buyers and Sellers. Messages are
            end-to-end encrypted using RSA-OAEP public-key cryptography. Encryption keys are generated
            on your device and your private key is never transmitted to or stored by Pedigree Coins.
            Pedigree Coins cannot read the content of encrypted messages. By using the messaging feature,
            you agree that Pedigree Coins is not responsible for the content of messages, cannot mediate
            message-based disputes, and may not be able to produce message content in response to legal
            process. Users are solely responsible for the content of messages they send.
          </p>
        </Subsection>
      </Section>

      <Section title="11. Disclaimers">
        <p className="font-medium text-foreground uppercase text-sm leading-relaxed">
          To the maximum extent permitted by applicable law, the Platform and all Listings, Coins, and
          content made available through it are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranty
          of any kind, express, implied, or statutory, including (without limitation) the implied
          warranties of merchantability, fitness for a particular purpose, non-infringement, title,
          accuracy, and quiet enjoyment.
        </p>
        <p className="font-medium text-foreground uppercase text-sm leading-relaxed mt-4">
          Pedigree Coins disclaims, and you acknowledge that Pedigree Coins makes no warranty or
          representation regarding: (a) the authenticity, genuineness, grade, attribution, condition,
          provenance, or value of any Coin; (b) the truthfulness, accuracy, or completeness of any
          Listing; (c) the identity, trustworthiness, solvency, or conduct of any User; (d) the
          delivery, timing, condition, or arrival of any Coin; or (e) the uninterrupted, secure, or
          error-free operation of the Platform.
        </p>
        <p className="mt-3">
          Some jurisdictions do not allow exclusion of certain warranties; in those jurisdictions, the
          disclaimers in this Section 11 apply only to the maximum extent permitted by applicable law.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p className="font-medium text-foreground uppercase text-sm leading-relaxed">
          To the maximum extent permitted by applicable law:
        </p>
        <Subsection title="12.1 No Indirect Damages">
          <p className="uppercase text-sm">
            Pedigree Coins and its officers, directors, employees, agents, and affiliates shall not be
            liable to you for any indirect, incidental, special, consequential, exemplary, or punitive
            damages, or for lost profits, lost revenue, lost data, lost goodwill, or business
            interruption, even if Pedigree Coins has been advised of the possibility of such damages.
          </p>
        </Subsection>
        <Subsection title="12.2 Aggregate Cap">
          <p className="uppercase text-sm">
            Pedigree Coins&rsquo;s total aggregate liability for all claims shall not exceed the greater of
            (a) the total fees paid by you to Pedigree Coins in the twelve (12) months immediately
            preceding the event giving rise to the claim, or (b) one hundred U.S. dollars (US $100).
          </p>
        </Subsection>
        <Subsection title="12.3 No Liability for Third-Party Acts">
          <p className="uppercase text-sm">
            Pedigree Coins has no liability for the acts, omissions, or performance of any Seller,
            Buyer, carrier, insurer, grading service, bank, Stripe, or other third party.
          </p>
        </Subsection>
        <Subsection title="12.4 Mandatory Carve-Outs">
          <p>
            Nothing in this Section 12 limits liability for (a) death or personal injury caused by
            Pedigree Coins&rsquo;s negligence; (b) fraud or fraudulent misrepresentation by Pedigree Coins;
            or (c) any other liability that cannot be limited or excluded under applicable law.
          </p>
        </Subsection>
      </Section>

      <Section title="13. Indemnification by Users">
        <p>
          You agree to defend, indemnify, and hold harmless Pedigree Coins and its officers, directors,
          employees, agents, and affiliates from and against any claim, demand, action, proceeding,
          loss, liability, damage, fine, penalty, cost, or expense (including reasonable attorneys&rsquo; fees)
          arising out of or relating to (a) your breach of these Terms; (b) your violation of any
          applicable law; (c) your infringement of any third party&rsquo;s rights; (d) any content you upload
          to or transmit through the Platform; and (e) for Sellers, the matters set out in Section 6.14.
        </p>
      </Section>

      <Section title="14. Term and Termination">
        <Subsection title="14.1 Term">
          <p>These Terms remain in effect for as long as you maintain an Account or use the Platform.</p>
        </Subsection>
        <Subsection title="14.2 Termination by You">
          <p>
            You may terminate your Account at any time through your Account settings or by emailing{' '}
            <a href="mailto:support@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              support@pedigreecoins.com
            </a>
            . Termination does not relieve you of obligations accrued before termination.
          </p>
        </Subsection>
        <Subsection title="14.3 Termination by Pedigree Coins">
          <p>
            Pedigree Coins may suspend or terminate your Account at any time as set out in Sections 6.13
            and 8 and otherwise at its sole discretion, with or without notice.
          </p>
        </Subsection>
        <Subsection title="14.4 Effect of Termination">
          <p>
            Upon termination, your right to access the Platform ceases. Sections 4.7, 5, 6.9, 6.12,
            6.14, 9, 11, 12, 13, 14, 15, 16, and 18 survive termination.
          </p>
        </Subsection>
      </Section>

      <Section title="15. Dispute Resolution; Mandatory Individual Arbitration; Class Action Waiver">
        <div className="bg-muted/40 border border-border rounded-lg px-4 py-3 mb-4 text-sm font-semibold text-foreground">
          PLEASE READ THIS SECTION CAREFULLY. IT REQUIRES YOU TO RESOLVE DISPUTES WITH PEDIGREE COINS
          THROUGH INDIVIDUAL BINDING ARBITRATION AND LIMITS THE WAYS IN WHICH YOU MAY SEEK RELIEF.
        </div>
        <Subsection title="15.1 Informal Resolution">
          <p>
            Before commencing arbitration, you and Pedigree Coins agree to attempt in good faith to
            resolve any dispute by sending written notice to{' '}
            <a href="mailto:legal@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              legal@pedigreecoins.com
            </a>{' '}
            and negotiating in good faith for at least sixty (60) days.
          </p>
        </Subsection>
        <Subsection title="15.2 Binding Individual Arbitration">
          <p>
            If a dispute is not resolved in the informal resolution period, it shall be resolved
            exclusively by binding individual arbitration administered by the American Arbitration
            Association (&ldquo;AAA&rdquo;) under its Consumer Arbitration Rules or Commercial Arbitration Rules
            (as applicable). The arbitration shall be conducted by a single arbitrator in Wilmington,
            Delaware. The arbitrator&rsquo;s award is final and binding.
          </p>
        </Subsection>
        <Subsection title="15.3 Class Action and Class Arbitration Waiver">
          <p className="uppercase text-sm font-medium text-foreground">
            You and Pedigree Coins each agree that any dispute must be brought on an individual basis
            only, and not as a plaintiff or class member in any purported class, collective, consolidated,
            or representative action.
          </p>
        </Subsection>
        <Subsection title="15.4 Small-Claims Carveout">
          <p>
            Either party may bring an individual action in a small-claims court of competent jurisdiction
            for a claim that seeks only monetary relief involving an amount in controversy not exceeding
            US $10,000.
          </p>
        </Subsection>
        <Subsection title="15.5 Non-Waivable Consumer Rights">
          <p>
            Nothing in this Section 15 deprives a User who is a consumer in a jurisdiction whose law
            provides non-waivable consumer-arbitration or consumer-court rights (including the EU, EEA,
            UK, and certain U.S. states) of those rights.
          </p>
        </Subsection>
        <Subsection title="15.6 Injunctive Relief">
          <p>
            Either party may seek temporary or preliminary injunctive relief in any court of competent
            jurisdiction in aid of arbitration, or to protect intellectual property pending arbitration.
          </p>
        </Subsection>
        <Subsection title="15.7 Opt-Out">
          <p>
            You may opt out of the arbitration agreement by sending written notice to{' '}
            <a href="mailto:legal@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              legal@pedigreecoins.com
            </a>{' '}
            within thirty (30) days of first accepting these Terms, including your full legal name, the
            email address associated with your Account, and a clear statement that you wish to opt out.
          </p>
        </Subsection>
      </Section>

      <Section title="16. Governing Law; Venue">
        <p>
          These Terms are governed by the laws of the State of Delaware, U.S.A., without regard to its
          conflict-of-laws principles. Subject to Section 15, the parties consent to the exclusive
          personal jurisdiction and venue of the state and federal courts located in Wilmington,
          Delaware. The United Nations Convention on Contracts for the International Sale of Goods does
          not apply.
        </p>
      </Section>

      <Section title="17. Changes to These Terms">
        <p>
          Pedigree Coins may update these Terms at any time by posting a revised version at
          pedigreecoins.com/terms and updating the &ldquo;Last Updated&rdquo; date. For material changes, Pedigree
          Coins will provide at least thirty (30) days&rsquo; prior notice by email and by an in-Platform
          notice. Your continued use of the Platform after the effective date of an update constitutes
          acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="18. Miscellaneous">
        <Subsection title="18.1 Entire Agreement">
          <p>These Terms (including the Privacy Policy, the Plan terms, and any other documents incorporated by reference) constitute the entire agreement between you and Pedigree Coins regarding the Platform.</p>
        </Subsection>
        <Subsection title="18.2 Severability">
          <p>If any provision is held invalid, illegal, or unenforceable, the remainder of these Terms shall remain in full force.</p>
        </Subsection>
        <Subsection title="18.3 No Waiver">
          <p>Failure by Pedigree Coins to enforce any provision is not a waiver of that or any other provision.</p>
        </Subsection>
        <Subsection title="18.4 Assignment">
          <p>You may not assign or transfer these Terms without Pedigree Coins&rsquo;s prior written consent. Pedigree Coins may assign these Terms without restriction.</p>
        </Subsection>
        <Subsection title="18.5 Notices">
          <p>
            Notices to Pedigree Coins must be sent by email to{' '}
            <a href="mailto:legal@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              legal@pedigreecoins.com
            </a>{' '}
            and by U.S. certified mail to: Pedigree Coins, Inc., Attn: Legal, 111 Quad Drive, Easton, PA 18042, USA.
          </p>
        </Subsection>
        <Subsection title="18.6 Force Majeure">
          <p>Pedigree Coins is not liable for any failure or delay resulting from causes beyond its reasonable control, including acts of God, war, terrorism, civil unrest, labor disputes, government action, sanctions, epidemic or pandemic, internet or telecommunications failure, or third-party service-provider failure.</p>
        </Subsection>
        <Subsection title="18.7–18.12">
          <p>These Terms also address: relationship between parties (no employment, partnership, or franchise relationship created); headings for convenience only; English language controls over any translation; consent to electronic communications; compliance with applicable export-control and economic-sanctions laws; and U.S. government end-user rights.</p>
        </Subsection>
      </Section>

      <Section title="19. Contact">
        <address className="not-italic space-y-1 text-muted-foreground">
          <p className="font-medium text-foreground">Pedigree Coins, Inc.</p>
          <p>Attn: Legal Department</p>
          <p>111 Quad Drive</p>
          <p>Easton, PA 18042</p>
          <p>United States</p>
          <p className="mt-2">
            General support:{' '}
            <a href="mailto:support@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              support@pedigreecoins.com
            </a>
          </p>
          <p>
            Legal notices:{' '}
            <a href="mailto:legal@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              legal@pedigreecoins.com
            </a>
          </p>
        </address>
      </Section>

      <div className="mt-16 pt-8 border-t border-border text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-2 hover:text-foreground">
          ← Back to Pedigree Coins
        </Link>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground space-y-2">{children}</div>
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-base font-medium text-foreground mb-2">{title}</h3>
      {children}
    </div>
  )
}
