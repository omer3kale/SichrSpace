import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'

export default function ScamStoriesPage() {
  return (
    <div className="scam-layout">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="scam-page">
        {/* ======= Hero ======= */}
        <section className="scam-hero">
          <h1 className="scam-hero-title">Scam Stories &amp; How to Avoid Them</h1>
          <p className="scam-hero-subtitle">
            Real-world-inspired examples of rental scams and practical advice on
            how to stay safe when searching for your next home.
          </p>
          <p className="scam-hero-text">
            SichrPlace was built specifically to reduce these risks. Learn to
            recognise the warning signs so you never fall victim.
          </p>
        </section>

        {/* ======= Story Cards ======= */}
        <div className="scam-stories">
          <div className="scam-stories-grid">

            {/* ── Story 1 ── */}
            <section className="scam-story">
              <div className="scam-story-badge">Story 1</div>
              <h2 className="scam-story-title">The Too-Good-To-Be-True Listing</h2>
              <p className="scam-story-text">
                A spacious two-bedroom apartment in central Munich listed at half the
                market rate. The photos showed a beautifully furnished flat with
                modern appliances and a balcony overlooking the Isar.
              </p>
              <p className="scam-story-text">
                The &quot;landlord&quot; responded instantly and pushed for an immediate
                deposit transfer before any viewing. When asked about an in-person
                visit, they claimed to be abroad and offered to post the keys after
                payment.
              </p>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-triangle-exclamation scam-icon-warn" /> Red flags
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Price significantly below comparable listings in the area</li>
                <li className="scam-list-item">Landlord unavailable for viewings and claims to be overseas</li>
                <li className="scam-list-item">Pressure to transfer money before seeing the property</li>
                <li className="scam-list-item">Offer to mail keys after payment instead of a proper handover</li>
              </ul>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-shield-halved scam-icon-safe" /> What to do instead
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Compare prices with similar listings in the neighbourhood</li>
                <li className="scam-list-item">Never pay any money before viewing the property in person or via verified video</li>
                <li className="scam-list-item">Insist on meeting the landlord or their authorised representative</li>
                <li className="scam-list-item">Use the platform&apos;s secure payment system, never wire money directly</li>
              </ul>
            </section>

            {/* ── Story 2 ── */}
            <section className="scam-story">
              <div className="scam-story-badge">Story 2</div>
              <h2 className="scam-story-title">Pay Deposit Before Viewing</h2>
              <p className="scam-story-text">
                After exchanging a few friendly messages, a prospective landlord asked
                the tenant to pay a &quot;reservation deposit&quot; to secure a viewing slot.
                They said the apartment was in high demand and slots would fill up
                within hours.
              </p>
              <p className="scam-story-text">
                Once the payment was made, the landlord stopped responding. The
                listing disappeared from the platform the next day, and the tenant
                had no way to recover the money.
              </p>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-triangle-exclamation scam-icon-warn" /> Red flags
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Any request for money before a viewing takes place</li>
                <li className="scam-list-item">Artificial urgency (&quot;only one slot left&quot;, &quot;other tenants are interested&quot;)</li>
                <li className="scam-list-item">Payment requested via bank transfer or cryptocurrency instead of the platform</li>
                <li className="scam-list-item">Landlord avoids phone or video calls</li>
              </ul>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-shield-halved scam-icon-safe" /> What to do instead
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Never pay anything before you have seen the property</li>
                <li className="scam-list-item">Legitimate landlords do not charge for viewing appointments</li>
                <li className="scam-list-item">Keep all communication on the platform so there is a record</li>
                <li className="scam-list-item">Report the listing to SichrPlace support immediately</li>
              </ul>
            </section>

            {/* ── Story 3 ── */}
            <section className="scam-story">
              <div className="scam-story-badge">Story 3</div>
              <h2 className="scam-story-title">Fake Landlord with Stolen Photos</h2>
              <p className="scam-story-text">
                A listing appeared with professional-quality photos of a stylish
                apartment in Berlin. The scammer had copied the images from a
                legitimate real-estate agency website and created a fake profile.
              </p>
              <p className="scam-story-text">
                The tenant signed a fake contract and paid the first month&apos;s rent
                plus deposit. On move-in day, they arrived to find the real owner
                had no idea who they were.
              </p>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-triangle-exclamation scam-icon-warn" /> Red flags
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Photos that look too polished or appear on other websites</li>
                <li className="scam-list-item">Landlord cannot provide additional photos or a live video walkthrough</li>
                <li className="scam-list-item">Contract sent before any personal meeting or verification</li>
                <li className="scam-list-item">Payment requested to a personal bank account, not through the platform</li>
                <li className="scam-list-item">Landlord profile is brand-new with no reviews or history</li>
              </ul>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-shield-halved scam-icon-safe" /> What to do instead
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Reverse-image-search listing photos to check for duplicates</li>
                <li className="scam-list-item">Ask the landlord for a live video tour of the property</li>
                <li className="scam-list-item">Verify the landlord&apos;s identity through SichrPlace&apos;s verification flow</li>
                <li className="scam-list-item">Never sign a contract or pay before visiting in person</li>
              </ul>
            </section>

            {/* ── Story 4 ── */}
            <section className="scam-story">
              <div className="scam-story-badge">Story 4</div>
              <h2 className="scam-story-title">Urgent Wire Transfer Request</h2>
              <p className="scam-story-text">
                During negotiations over a seemingly legitimate apartment, the
                landlord suddenly requested an urgent wire transfer, claiming they
                had another interested tenant and needed the deposit within 24 hours.
              </p>
              <p className="scam-story-text">
                They provided a foreign bank account and insisted the tenant bypass
                the platform&apos;s payment system &quot;to save on fees&quot;. Once the money was
                sent, contact was cut off.
              </p>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-triangle-exclamation scam-icon-warn" /> Red flags
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Extreme time pressure (&quot;pay within 24 hours or lose the apartment&quot;)</li>
                <li className="scam-list-item">Request to pay outside the platform to &quot;save fees&quot;</li>
                <li className="scam-list-item">Foreign or unusual bank account details</li>
                <li className="scam-list-item">Refusal to use the platform&apos;s secure checkout</li>
              </ul>

              <h3 className="scam-subheading">
                <i className="fa-solid fa-shield-halved scam-icon-safe" /> What to do instead
              </h3>
              <ul className="scam-list">
                <li className="scam-list-item">Take your time; legitimate landlords will not pressure you</li>
                <li className="scam-list-item">Always pay through SichrPlace&apos;s integrated payment system</li>
                <li className="scam-list-item">Never wire money to a personal or foreign account</li>
                <li className="scam-list-item">Report any off-platform payment requests to support</li>
              </ul>
            </section>

          </div>
        </div>

        {/* ======= Safety Checklists ======= */}
        <section className="scam-checklists">
          <div className="scam-checklist">
            <h2 className="scam-checklist-title">
              <i className="fa-solid fa-user scam-checklist-icon" /> For Tenants
            </h2>
            <p className="scam-checklist-text">
              Follow these rules every time you search for a rental to protect
              yourself from fraud.
            </p>
            <ul className="scam-checklist-list">
              <li className="scam-checklist-item">Never pay a deposit before seeing the property in person or via a trusted verified video call</li>
              <li className="scam-checklist-item">Always use the platform&apos;s messaging and payment system instead of sending money off-platform</li>
              <li className="scam-checklist-item">Check for inconsistent information between the listing description, photos, and address</li>
              <li className="scam-checklist-item">Verify the landlord&apos;s identity through SichrPlace&apos;s verification flow</li>
              <li className="scam-checklist-item">Be suspicious of prices significantly below market rate for the area</li>
              <li className="scam-checklist-item">Never share sensitive personal documents (ID, bank details) outside the platform</li>
              <li className="scam-checklist-item">Report suspicious listings or messages to SichrPlace support immediately</li>
            </ul>
          </div>

          <div className="scam-checklist">
            <h2 className="scam-checklist-title">
              <i className="fa-solid fa-building scam-checklist-icon" /> For Landlords
            </h2>
            <p className="scam-checklist-text">
              Protect your property and your reputation by following these best
              practices.
            </p>
            <ul className="scam-checklist-list">
              <li className="scam-checklist-item">Verify tenant identity through the platform&apos;s built-in verification before granting access</li>
              <li className="scam-checklist-item">Collect rent and deposits exclusively through SichrPlace&apos;s secure payment system</li>
              <li className="scam-checklist-item">Be cautious of tenants who want to skip viewings and pay immediately</li>
              <li className="scam-checklist-item">Keep a record of all communication on the platform</li>
              <li className="scam-checklist-item">Never share your bank details directly with prospective tenants</li>
              <li className="scam-checklist-item">Watch for tenants using stolen identity documents or inconsistent personal details</li>
              <li className="scam-checklist-item">Report suspicious behaviour through the platform&apos;s reporting feature</li>
            </ul>
          </div>
        </section>

        {/* ======= How SichrPlace Protects You ======= */}
        <section className="scam-protection">
          <h2 className="scam-protection-title">How SichrPlace Helps You Stay Safe</h2>
          <div className="scam-protection-list">

            <div className="scam-protection-item">
              <i className="fa-solid fa-envelope-circle-check scam-protection-icon" />
              <h3 className="scam-protection-item-title">Verified Accounts</h3>
              <p className="scam-protection-item-text">
                Every account goes through an email verification flow. Landlords and
                tenants are held to a single-role policy, preventing impersonation
                and dual-role abuse.
              </p>
            </div>

            <div className="scam-protection-item">
              <i className="fa-solid fa-magnifying-glass scam-protection-icon" />
              <h3 className="scam-protection-item-title">Listing Moderation</h3>
              <p className="scam-protection-item-text">
                Our backend checks flag listings with suspicious patterns such as
                unusually low prices, duplicate photos, or missing information so
                they can be reviewed before going live.
              </p>
            </div>

            <div className="scam-protection-item">
              <i className="fa-solid fa-credit-card scam-protection-icon" />
              <h3 className="scam-protection-item-title">Secure Payments</h3>
              <p className="scam-protection-item-text">
                Payments are processed by Stripe and PayPal. SichrPlace never stores
                your card or bank details, and you never have to send money directly
                to a stranger.
              </p>
            </div>

            <div className="scam-protection-item">
              <i className="fa-solid fa-lock scam-protection-icon" />
              <h3 className="scam-protection-item-title">GDPR-Compliant Data Handling</h3>
              <p className="scam-protection-item-text">
                Your personal data is processed in full compliance with EU data
                protection law. You can export or delete your data at any time from
                your privacy settings.
              </p>
            </div>

          </div>
        </section>

        {/* ======= CTA ======= */}
        <section className="scam-cta">
          <h2 className="scam-cta-title">Ready to Rent Safely?</h2>
          <p className="scam-cta-text">
            If you spot a suspicious listing or receive a questionable message,
            report it immediately. Our team investigates every report.
          </p>
          <div className="scam-cta-buttons">
            <Link href="/offer" className="scam-cta-primary">
              <i className="fa-solid fa-search" /> Browse Verified Listings
            </Link>
            <Link href="/customer-service" className="scam-cta-secondary">
              <i className="fa-solid fa-flag" /> Report a Suspicious Listing
            </Link>
          </div>
        </section>
      </main>

      {/* ======= Footer ======= */}
      <footer className="scam-footer">
        <LogoLink size={36} />
        <p className="scam-footer-copy">
          &copy; {new Date().getFullYear()} SichrPlace. All rights reserved.
        </p>
        <nav className="scam-footer-nav">
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/about">About</Link>
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </div>
  )
}
