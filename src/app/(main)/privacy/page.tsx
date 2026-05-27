export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Pedigree Coins',
  description: 'Privacy Policy for Pedigree Coins marketplace.',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-1">Pedigree Coins · pedigreecoins.com</p>
      <p className="text-sm text-muted-foreground mb-10">
        Effective Date: May 26, 2026 · Last Updated: May 26, 2026
      </p>

      <Section title="1. Introduction">
        <p>
          Pedigree Coins (&ldquo;Pedigree Coins,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates an online marketplace
          at pedigreecoins.com (the &ldquo;Site&rdquo;) that connects buyers and sellers of collectible coins. This Privacy
          Policy explains how we collect, use, disclose, retain, and protect personal information about
          visitors, account holders, buyers, and sellers (collectively, &ldquo;you&rdquo; or &ldquo;Users&rdquo;).
        </p>
        <p className="mt-4">This Policy is designed to comply with applicable privacy laws, including:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>The California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act of 2020 (&ldquo;CCPA/CPRA&rdquo;);</li>
          <li>Privacy laws of all 50 U.S. states with comprehensive consumer privacy statutes in force or coming into effect, including Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas (TDPSA), Oregon (OCPA), Montana (MCDPA), Iowa (ICDPA), Indiana (INCDPA), Tennessee (TIPA), Delaware (DPDPA), New Hampshire (NHDPA), New Jersey (NJDPA), Maryland (MODPA), Minnesota (MCDPA), Rhode Island (RIDTPPA), Nebraska (NDPA), Kentucky (KCDPA), and others as they take effect;</li>
          <li>The EU General Data Protection Regulation (Regulation (EU) 2016/679) (&ldquo;GDPR&rdquo;);</li>
          <li>The UK General Data Protection Regulation and the Data Protection Act 2018 (&ldquo;UK GDPR&rdquo;);</li>
          <li>The Personal Information Protection and Electronic Documents Act (Canada) (&ldquo;PIPEDA&rdquo;) and applicable provincial laws;</li>
          <li>Brazil&rsquo;s Lei Geral de Proteção de Dados (&ldquo;LGPD&rdquo;);</li>
          <li>The Children&rsquo;s Online Privacy Protection Act (&ldquo;COPPA&rdquo;); and</li>
          <li>Other applicable federal, state, and international laws.</li>
        </ul>
        <p className="mt-4">
          By accessing or using the Site, you acknowledge that you have read and understood this Policy.
          If you do not agree, please do not use the Site.
        </p>
      </Section>

      <Section title="2. Scope">
        <p>This Policy applies to personal information we collect:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>through the Site and any subdomains;</li>
          <li>through buyer and seller accounts on our marketplace;</li>
          <li>through customer-support communications (email, chat, forms); and</li>
          <li>through our use of analytics and similar technologies on the Site.</li>
        </ul>
        <p className="mt-4">
          This Policy does not apply to third-party sites or services (including individual sellers&rsquo;
          off-platform communications), even if linked from the Site. Their privacy practices are governed
          by their own policies.
        </p>
      </Section>

      <Section title="3. Information We Collect">
        <p>
          We collect personal information in the following categories. The specific information collected
          depends on how you interact with the Site.
        </p>

        <Subsection title="3.1 Information You Provide Directly">
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Account information:</strong> name, email address, username, password (hashed), and account preferences.</li>
            <li><strong>Buyer information:</strong> shipping address, billing address, order history, and communications with sellers.</li>
            <li><strong>Seller information:</strong> display name, listings, payout details (handled by Stripe, see Section 3.3), tax-related information required for marketplace operation, and seller communications.</li>
            <li><strong>Customer-support content:</strong> the contents of emails, support tickets, and any attachments you choose to share.</li>
            <li><strong>Marketing preferences:</strong> your subscription status for newsletters and promotional communications.</li>
          </ul>
        </Subsection>

        <Subsection title="3.2 Information Collected Automatically">
          <p>When you visit or interact with the Site, we and our service providers automatically collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Device and connection data:</strong> IP address, device identifiers, browser type and version, operating system, and language preferences.</li>
            <li><strong>Usage data:</strong> pages visited, referring/exit pages, time spent on pages, clickstream data, and search queries on the Site.</li>
            <li><strong>Cookies and similar technologies:</strong> see Section 7 below.</li>
            <li><strong>Approximate location:</strong> derived from IP address.</li>
          </ul>
        </Subsection>

        <Subsection title="3.3 Information Collected Through Stripe (KYC, KYB, and Payments)">
          <p>
            We use Stripe, Inc. (&ldquo;Stripe&rdquo;) as our payment processor and to perform Know-Your-Customer
            (&ldquo;KYC&rdquo;) and Know-Your-Business (&ldquo;KYB&rdquo;) verification for sellers and to link seller bank accounts
            for payouts.
          </p>
          <p className="mt-3">When you transact on the marketplace or onboard as a seller, Stripe directly collects information such as:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Full legal name, date of birth, residential address, and government-issued identification;</li>
            <li>Business name, business address, EIN/tax ID, and beneficial-ownership information (for sellers operating as businesses);</li>
            <li>Bank account and routing information for payouts;</li>
            <li>Payment-card details for buyers (we do not store full card numbers on our servers); and</li>
            <li>Other information required for Stripe&rsquo;s identity verification and anti-fraud obligations.</li>
          </ul>
          <p className="mt-3">
            This information is collected and processed by Stripe under Stripe&rsquo;s own privacy practices,
            available at{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              https://stripe.com/privacy
            </a>
            . We receive limited verification status and tokenized payment references from Stripe; we do
            not receive your full government ID or full bank account numbers.
          </p>
        </Subsection>

        <Subsection title="3.4 Information from Third Parties">
          <p>We may receive information about you from:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Stripe, with respect to identity-verification outcomes and payment status;</li>
            <li>Analytics providers (e.g., Google Analytics) regarding aggregate or pseudonymous Site usage;</li>
            <li>Fraud-prevention providers;</li>
            <li>Sellers or buyers with whom you have transacted, in the context of dispute resolution; and</li>
            <li>Publicly available sources, where lawful.</li>
          </ul>
        </Subsection>

        <Subsection title="3.5 Categories of Personal Information Under the CCPA/CPRA">
          <p>For California residents, the categories of personal information we have collected in the preceding 12 months are:</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium border-b border-border">CCPA Category</th>
                  <th className="text-left px-4 py-2 font-medium border-b border-border">Examples</th>
                  <th className="text-left px-4 py-2 font-medium border-b border-border">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Identifiers', 'Name, email, IP address, account ID', 'Yes'],
                  ['Customer records (Cal. Civ. Code §1798.80(e))', 'Name, address, payment info (via Stripe)', 'Yes'],
                  ['Protected classifications', 'Age, gender, national origin', 'No (not intentionally)'],
                  ['Commercial information', 'Purchase history, listings, transaction data', 'Yes'],
                  ['Biometric information', 'N/A', 'No'],
                  ['Internet/network activity', 'Browsing history on the Site, interactions with ads', 'Yes'],
                  ['Geolocation', 'Approximate (from IP)', 'Yes'],
                  ['Sensory data', 'N/A', 'No'],
                  ['Professional/employment', 'N/A', 'No'],
                  ['Education information', 'N/A', 'No'],
                  ['Inferences from the above', 'User preferences, likely interests', 'Yes (limited)'],
                  ['Sensitive personal information', 'Government ID via Stripe (we do not retain full ID)', 'Limited'],
                ].map(([category, examples, collected]) => (
                  <tr key={category}>
                    <td className="px-4 py-2 align-top">{category}</td>
                    <td className="px-4 py-2 align-top text-muted-foreground">{examples}</td>
                    <td className="px-4 py-2 align-top">{collected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            We do not knowingly collect personal information from individuals under 16 years of age.
          </p>
        </Subsection>
      </Section>

      <Section title="4. How We Use Personal Information (Purposes of Processing)">
        <p>We use personal information for the following purposes:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Operating the marketplace:</strong> creating and managing accounts, listing items, facilitating transactions between buyers and sellers, processing payments via Stripe, and arranging shipping.</li>
          <li><strong>Identity verification &amp; fraud prevention:</strong> through Stripe&rsquo;s KYC/KYB processes and our own anti-fraud tooling.</li>
          <li><strong>Customer support:</strong> responding to inquiries, resolving disputes, and providing service updates.</li>
          <li><strong>Site improvement &amp; analytics:</strong> understanding how the Site is used, diagnosing technical issues, and improving features (using tools such as Google Analytics).</li>
          <li><strong>Communications:</strong> sending transactional emails (order confirmations, shipping updates, account notices) and, where permitted, marketing communications.</li>
          <li><strong>Legal compliance:</strong> meeting our obligations under tax, AML/BSA, consumer protection, and other applicable laws, and responding to lawful requests.</li>
          <li><strong>Security:</strong> protecting the Site, our Users, and third parties from fraud, abuse, and unauthorized access.</li>
          <li><strong>Enforcement:</strong> enforcing our Terms of Service and other agreements.</li>
        </ul>

        <Subsection title="4.1 Legal Bases for Processing (GDPR / UK GDPR)">
          <p>For Users in the EEA, UK, or Switzerland, we rely on the following legal bases under Article 6 GDPR:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Contract performance (Art. 6(1)(b)),</strong> to provide the marketplace, fulfill transactions, and operate accounts.</li>
            <li><strong>Legal obligation (Art. 6(1)(c)),</strong> to comply with tax, AML, consumer-protection, and similar laws.</li>
            <li><strong>Legitimate interests (Art. 6(1)(f)),</strong> to prevent fraud, secure the Site, improve our services, and conduct limited marketing. Where we rely on legitimate interests, we balance these against your rights and freedoms.</li>
            <li><strong>Consent (Art. 6(1)(a)),</strong> for non-essential cookies, certain marketing communications, and any other processing where consent is required. You may withdraw consent at any time.</li>
          </ul>
          <p className="mt-3">
            We do not process Special Categories of Personal Data under Article 9 GDPR. Identity documents
            handled by Stripe are processed by Stripe as a separate controller for AML/KYC purposes.
          </p>
        </Subsection>
      </Section>

      <Section title="5. How We Disclose Personal Information">
        <p>
          We disclose personal information only as described below. We do not sell personal information
          for monetary consideration. Some sharing of cookie- and analytics-related identifiers with
          providers such as Google Analytics may be considered a &ldquo;sale&rdquo; or &ldquo;share&rdquo; under the broad
          definitions in the CCPA/CPRA and certain other state privacy laws; we treat this transparently
          and provide opt-out rights (see Section 10).
        </p>

        <Subsection title="5.1 Service Providers / Processors">
          <p>We share personal information with vendors that process data on our behalf under contractual safeguards, including:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Stripe, Inc.: payment processing, KYC/KYB, payouts, and fraud prevention;</li>
            <li>Hosting and infrastructure providers;</li>
            <li>Email delivery providers (transactional and marketing email);</li>
            <li>Analytics providers (e.g., Google Analytics);</li>
            <li>Customer-support tooling;</li>
            <li>Security, anti-fraud, and logging providers.</li>
          </ul>
        </Subsection>

        <Subsection title="5.2 Other Marketplace Users">
          <p>When you transact on the marketplace, we share information necessary to complete the transaction:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Buyers receive the seller&rsquo;s display name and the shipping interface required to receive the item.</li>
            <li>Sellers receive the buyer&rsquo;s shipping name, address, and order details.</li>
          </ul>
          <p className="mt-2">We do not share buyer/seller payment details directly; these are handled via Stripe.</p>
        </Subsection>

        <Subsection title="5.3 Legal, Regulatory, and Safety Disclosures">
          <p>We may disclose personal information when we believe in good faith that disclosure is necessary to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>comply with applicable law, legal process, or governmental request (including from law enforcement);</li>
            <li>enforce our Terms of Service;</li>
            <li>detect, prevent, or address fraud, security, or technical issues; or</li>
            <li>protect the rights, property, or safety of Pedigree Coins, our Users, or others.</li>
          </ul>
        </Subsection>

        <Subsection title="5.4 Business Transfers">
          <p>
            If Pedigree Coins is involved in a merger, acquisition, financing, reorganization, bankruptcy,
            or sale of assets, personal information may be transferred as part of that transaction, subject
            to standard confidentiality protections.
          </p>
        </Subsection>

        <Subsection title="5.5 With Your Consent">
          <p>We may disclose personal information for any other purpose with your consent.</p>
        </Subsection>
      </Section>

      <Section title="6. International Data Transfers">
        <p>
          Pedigree Coins is based in the United States. If you access the Site from outside the United
          States, your personal information will be transferred to, stored, and processed in the United
          States and other jurisdictions where our service providers operate.
        </p>
        <p className="mt-3">For transfers from the EEA, UK, or Switzerland, we rely on:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>Standard Contractual Clauses approved by the European Commission (and the UK Addendum, where applicable);</li>
          <li>the adequacy decisions issued by the European Commission, where applicable;</li>
          <li>other lawful transfer mechanisms as required.</li>
        </ul>
        <p className="mt-3">
          You may request a copy of the safeguards in place by contacting us at the address in Section 13.
        </p>
      </Section>

      <Section title="7. Cookies and Similar Technologies">
        <p>
          We use cookies, pixels, and similar technologies to operate the Site, remember your preferences,
          analyze traffic, and (where you consent) support marketing.
        </p>

        <Subsection title="7.1 Categories of Cookies">
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li><strong>Strictly necessary cookies:</strong> required for the Site to function (e.g., session management, security). These do not require consent.</li>
            <li><strong>Analytics cookies:</strong> help us understand how Users interact with the Site (e.g., Google Analytics). Set only where permitted by your consent choices.</li>
            <li><strong>Functional cookies:</strong> remember preferences such as language or display settings.</li>
            <li><strong>Marketing/advertising cookies:</strong> used for remarketing or measuring marketing performance. Set only with your consent.</li>
          </ul>
        </Subsection>

        <Subsection title="7.2 Managing Cookies">
          <p>
            You can manage cookie preferences at any time via the cookie preference center on the Site
            (the &ldquo;Cookie Settings&rdquo; link in the Site footer or the banner shown on your first visit). You
            can also block or delete cookies through your browser settings.
          </p>
          <p className="mt-3">
            We honor Global Privacy Control (GPC) signals as a request to opt out of the &ldquo;sale&rdquo; or
            &ldquo;sharing&rdquo; of personal information under applicable state laws.
          </p>
        </Subsection>
      </Section>

      <Section title="8. Data Retention">
        <p>
          We retain personal information only for as long as necessary for the purposes described in this
          Policy, unless a longer retention period is required or permitted by law. Our standard retention
          schedule is:
        </p>
        <ul className="list-disc pl-6 mt-3 space-y-1">
          <li><strong>Active accounts:</strong> retained while the account remains active.</li>
          <li><strong>Inactive accounts:</strong> retained for 3 years from last activity, then deleted or anonymized, unless a longer retention period is legally required.</li>
          <li><strong>Transaction and financial records:</strong> retained for 7 years to comply with tax, accounting, and AML obligations.</li>
          <li><strong>KYC/KYB records (held by Stripe):</strong> retained by Stripe in accordance with Stripe&rsquo;s policies and applicable AML laws (typically at least 5 years after the end of the customer relationship).</li>
          <li><strong>Customer-support communications:</strong> retained for 3 years after resolution.</li>
          <li><strong>Marketing data:</strong> retained until you withdraw consent or unsubscribe.</li>
          <li><strong>Analytics data:</strong> retained per the analytics provider&rsquo;s configured retention (typically 14 to 26 months for Google Analytics).</li>
          <li><strong>Backups and disaster-recovery copies:</strong> retained on rolling schedules and deleted in the ordinary course.</li>
        </ul>
        <p className="mt-3">When the retention period expires, we delete, aggregate, or anonymize the data.</p>
      </Section>

      <Section title="9. Your Privacy Rights">
        <p>
          Depending on where you live, you may have rights regarding your personal information. We honor
          these rights for all users regardless of jurisdiction, to the extent reasonably practicable.
        </p>

        <Subsection title="9.1 Rights Available to All Users">
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Access:</strong> request a copy of the personal information we hold about you.</li>
            <li><strong>Correction:</strong> request that inaccurate or incomplete information be corrected.</li>
            <li><strong>Deletion:</strong> request that we delete your personal information, subject to legal exceptions.</li>
            <li><strong>Portability:</strong> request a copy of certain information in a structured, machine-readable format.</li>
            <li><strong>Withdraw consent:</strong> where processing is based on consent, you may withdraw it at any time.</li>
            <li><strong>Object / restrict:</strong> object to, or request restriction of, certain processing.</li>
            <li><strong>Unsubscribe:</strong> opt out of marketing communications at any time using the unsubscribe link.</li>
          </ul>
        </Subsection>

        <Subsection title="9.2 Additional Rights for U.S. State Residents (CCPA/CPRA and Equivalents)">
          <p>
            If you are a resident of California, Virginia, Colorado, Connecticut, Utah, Texas, Oregon,
            Montana, Iowa, Indiana, Tennessee, Delaware, New Hampshire, New Jersey, Maryland, Minnesota,
            Rhode Island, Nebraska, Kentucky, or any other U.S. state with comprehensive consumer privacy
            legislation, you may have the following additional rights:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Right to know the categories and specific pieces of personal information collected, the sources, the purposes, and the categories of third parties to whom it is disclosed.</li>
            <li>Right to delete personal information we have collected (subject to exceptions).</li>
            <li>Right to correct inaccurate personal information.</li>
            <li>Right to opt out of &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of personal information, including for cross-context behavioral advertising. You can exercise this right by using the &ldquo;Do Not Sell or Share My Personal Information&rdquo; link in the Site footer, by adjusting cookie settings, or by sending a Global Privacy Control signal.</li>
            <li>Right to limit use of sensitive personal information (CPRA).</li>
            <li>Right to non-discrimination: we will not discriminate against you for exercising any of these rights.</li>
            <li>Right to opt out of profiling that produces legal or similarly significant effects (where applicable under your state&rsquo;s law).</li>
            <li>Right to appeal: if we decline to act on your request, you may appeal that decision by replying to our response or contacting us at the address in Section 13.</li>
          </ul>
          <p className="mt-3">
            We retain the categories listed in Section 3.5 for the periods described in Section 8. In the
            preceding 12 months, we have:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Collected the categories of personal information listed in Section 3.5;</li>
            <li>Disclosed for a business purpose identifiers, customer records, commercial information, internet activity, geolocation, and inferences, to the service providers listed in Section 5.1;</li>
            <li>&ldquo;Sold&rdquo; or &ldquo;Shared&rdquo; (as broadly defined): we do not sell personal information for monetary value; however, our use of analytics and similar technologies (such as Google Analytics) may involve &ldquo;sharing&rdquo; of identifiers under the CCPA/CPRA&rsquo;s broad definitions. You can opt out via the cookie preference center.</li>
          </ul>
        </Subsection>

        <Subsection title="9.3 Rights for Users in the EEA, UK, and Switzerland (GDPR / UK GDPR)">
          <p>In addition to the rights above, you have the right to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Lodge a complaint with your local supervisory authority (for the UK, the ICO; for EEA Member States, your national Data Protection Authority).</li>
            <li>Not be subject to a decision based solely on automated processing that produces legal or similarly significant effects.</li>
          </ul>
          <p className="mt-3">
            We do not currently engage in automated decision-making that produces legal or similarly
            significant effects on you.
          </p>
        </Subsection>

        <Subsection title="9.4 How to Exercise Your Rights">
          <p>
            Submit a request by emailing us at{' '}
            <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              privacy@pedigreecoins.com
            </a>{' '}
            or writing to us at the postal address in Section 13. Include enough information for us to
            identify you and locate your data. We may need to verify your identity before fulfilling the
            request.
          </p>
          <p className="mt-3">
            You may use an authorized agent to submit a request on your behalf where permitted by law.
            We may require proof of authorization.
          </p>
          <p className="mt-3">
            We will respond within the timeframes required by applicable law (generally 45 days under U.S.
            state laws, with one extension permitted, and 1 month under GDPR/UK GDPR, with up to a 2-month
            extension for complex requests).
          </p>
        </Subsection>
      </Section>

      <Section title="10. Opt-Out of &ldquo;Sale&rdquo; or &ldquo;Sharing&rdquo; / Targeted Advertising">
        <p>
          While we do not sell personal information for monetary consideration, we treat our use of certain
          analytics and similar technologies transparently as potential &ldquo;sharing&rdquo; under the broad
          definitions of the CCPA/CPRA and similar U.S. state laws.
        </p>
        <p className="mt-3">You can opt out at any time by:</p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li>clicking the &ldquo;Do Not Sell or Share My Personal Information&rdquo; link in the Site footer;</li>
          <li>adjusting your preferences in the Cookie Settings;</li>
          <li>sending a Global Privacy Control (GPC) browser signal, which we will recognize as an opt-out request; or</li>
          <li>
            emailing us at{' '}
            <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              privacy@pedigreecoins.com
            </a>.
          </li>
        </ul>
        <p className="mt-3">
          Opt-outs are processed for the specific browser/device used. You may need to repeat the opt-out
          across devices and browsers.
        </p>
      </Section>

      <Section title="11. Data Security">
        <p>
          We maintain administrative, technical, and physical safeguards designed to protect personal
          information against unauthorized access, alteration, disclosure, or destruction. These include
          encryption in transit (TLS), restricted access controls, secure password storage (hashing with
          industry-standard algorithms), logging and monitoring, and use of reputable service providers
          (including Stripe for payment and KYC data).
        </p>
        <p className="mt-3">
          No system is perfectly secure. If you believe your account has been compromised, contact us at{' '}
          <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
            privacy@pedigreecoins.com
          </a>{' '}
          immediately.
        </p>
      </Section>

      <Section title="12. Children's Privacy">
        <p>
          The Site is not directed to, and we do not knowingly collect personal information from, children
          under the age of 16. If you believe a child under 16 has provided personal information to us,
          please contact us at{' '}
          <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
            privacy@pedigreecoins.com
          </a>{' '}
          and we will take appropriate steps to delete it. Where applicable, we comply with the Children&rsquo;s
          Online Privacy Protection Act (&ldquo;COPPA&rdquo;) and equivalent international laws.
        </p>
      </Section>

      <Section title="13. Contact Us">
        <p>For questions about this Policy, to exercise your rights, or to submit a complaint, contact us at:</p>
        <address className="not-italic mt-4 space-y-1 text-muted-foreground">
          <p className="font-medium text-foreground">Pedigree Coins</p>
          <p>Attn: Privacy</p>
          <p>111 Quad Dr.</p>
          <p>Easton, PA 18042</p>
          <p>United States</p>
          <p className="mt-2">
            Email:{' '}
            <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
              privacy@pedigreecoins.com
            </a>
          </p>
        </address>

        <Subsection title="13.1 EU/UK Representative">
          <p>
            Pedigree Coins has not appointed an EU representative under Article 27 GDPR or a UK
            representative under Article 27 UK GDPR. If our processing activities trigger the requirement
            to appoint such a representative, we will update this Policy and provide their contact details
            here. EEA and UK Users may contact us at the email above in the meantime.
          </p>
        </Subsection>

        <Subsection title="13.2 Data Protection Officer">
          <p>
            Pedigree Coins is not required to appoint a Data Protection Officer under Article 37 GDPR.
            Privacy inquiries are handled by the contact above.
          </p>
        </Subsection>
      </Section>

      <Section title="14. Notice to California Residents: &ldquo;Shine the Light&rdquo;">
        <p>
          California Civil Code § 1798.83 permits California residents to request information regarding
          our disclosure of personal information to third parties for their direct marketing purposes.
          We do not disclose personal information to third parties for their direct marketing purposes.
        </p>
      </Section>

      <Section title="15. Notice to Nevada Residents">
        <p>
          Nevada residents may submit a verified request to opt out of the sale of personal information
          by contacting{' '}
          <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
            privacy@pedigreecoins.com
          </a>
          . As stated above, we do not sell personal information as defined under Nevada law.
        </p>
      </Section>

      <Section title="16. Notice to Residents of Other U.S. States">
        <p>
          In addition to California, Virginia, Colorado, Connecticut, and Utah, we honor the substantive
          rights and obligations of comprehensive privacy laws in the following states (and any others as
          they come into effect):
        </p>
        <p className="mt-3">
          Texas, Oregon, Montana, Iowa, Indiana, Tennessee, Delaware, New Hampshire, New Jersey, Maryland,
          Minnesota, Rhode Island, Nebraska, and Kentucky.
        </p>
        <p className="mt-3">
          For residents of states without comprehensive privacy laws (e.g., Alabama, Alaska, Arizona,
          Arkansas, Georgia, Hawaii, Idaho, Illinois, Kansas, Louisiana, Maine, Massachusetts, Michigan,
          Mississippi, Missouri, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma,
          Pennsylvania, South Carolina, South Dakota, Vermont, Washington, West Virginia, Wisconsin,
          Wyoming), we voluntarily extend the core rights described in Section 9.1 (access, correction,
          deletion, portability) and honor opt-outs of marketing and Global Privacy Control signals.
          Sector-specific state laws (such as Washington&rsquo;s My Health My Data Act and Illinois&rsquo;s BIPA) are
          observed where they apply to our limited processing.
        </p>
      </Section>

      <Section title="17. Notice to Canadian Residents">
        <p>
          We comply with PIPEDA and applicable provincial privacy laws (including Quebec&rsquo;s Law 25,
          Alberta&rsquo;s PIPA, and British Columbia&rsquo;s PIPA). Canadian residents may exercise rights of access,
          correction, and withdrawal of consent by contacting us at{' '}
          <a href="mailto:privacy@pedigreecoins.com" className="underline underline-offset-2 hover:text-foreground">
            privacy@pedigreecoins.com
          </a>
          .
        </p>
      </Section>

      <Section title="18. Changes to This Policy">
        <p>
          We may update this Policy from time to time. The &ldquo;Last Updated&rdquo; date at the top reflects the
          most recent revision. Material changes will be communicated via a notice on the Site or by email
          where appropriate. Your continued use of the Site after the effective date of any revised Policy
          constitutes acceptance of the changes.
        </p>
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
