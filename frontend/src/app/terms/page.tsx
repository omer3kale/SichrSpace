import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'

export default function TermsOfServicePage() {
  return (
    <div className="tos-layout">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="tos-main">
        <h1 className="tos-title">Terms of Service</h1>
        <p className="tos-subtitle">Last updated: February 2026</p>

        {/* ---- 1. Introduction ---- */}
        <section>
          <h2 className="tos-section-title">1. Introduction and Acceptance of Terms</h2>
          <p className="tos-text">
            These Terms of Service (&quot;Terms&quot;) govern your access to and use of the SichrPlace
            platform, including our website, applications, and related services (collectively, the
            &quot;Platform&quot;). By creating an account or using any part of the Platform, you agree to
            be bound by these Terms.
          </p>
          <p className="tos-text">
            If you do not agree to these Terms, you must not access or use the Platform. We recommend
            that you read these Terms carefully before proceeding.
          </p>
        </section>

        {/* ---- 2. Eligibility ---- */}
        <section>
          <h2 className="tos-section-title">2. Eligibility and Account Registration</h2>
          <p className="tos-text">
            To use SichrPlace, you must be at least 18 years of age or the age of legal majority in your
            jurisdiction, whichever is greater. By registering, you represent that you meet this
            requirement.
          </p>
          <p className="tos-text">
            When you create an account, you agree to provide accurate, complete, and current information.
            You are responsible for maintaining the confidentiality of your login credentials and for all
            activities that occur under your account. You must notify us immediately of any unauthorized
            use of your account.
          </p>
        </section>

        {/* ---- 3. Use of the Platform ---- */}
        <section>
          <h2 className="tos-section-title">3. Use of the Platform</h2>
          <p className="tos-text">
            SichrPlace serves as a marketplace connecting tenants seeking rental accommodations with
            landlords offering properties. The Platform provides tools for listing properties, searching
            available apartments, scheduling viewings, and facilitating bookings.
          </p>
          <p className="tos-text"><strong>Tenant responsibilities:</strong></p>
          <ul className="tos-list">
            <li className="tos-list-item">
              Provide truthful information when submitting viewing or booking requests.
            </li>
            <li className="tos-list-item">
              Attend scheduled viewings or cancel in a timely manner.
            </li>
            <li className="tos-list-item">
              Comply with the terms of any rental agreement entered into with a landlord.
            </li>
          </ul>
          <p className="tos-text"><strong>Landlord responsibilities:</strong></p>
          <ul className="tos-list">
            <li className="tos-list-item">
              Ensure that all property listings are accurate, up to date, and do not contain misleading
              information.
            </li>
            <li className="tos-list-item">
              Respond to viewing and booking requests within a reasonable timeframe.
            </li>
            <li className="tos-list-item">
              Comply with all applicable local housing laws and regulations.
            </li>
          </ul>
        </section>

        {/* ---- 4. Listings, Viewings, and Bookings ---- */}
        <section>
          <h2 className="tos-section-title">4. Listings, Viewings, and Bookings</h2>
          <p className="tos-text">
            Landlords may create property listings on SichrPlace that include descriptions, photographs,
            pricing, and availability information. SichrPlace does not independently verify the accuracy
            of listings and is not a party to any rental agreement between landlords and tenants.
          </p>
          <p className="tos-text">
            Viewing requests submitted through the Platform are subject to landlord approval. A confirmed
            viewing does not constitute a binding rental agreement. Booking requests are facilitated
            through the Platform but the final rental agreement is between the landlord and the tenant.
          </p>
          <p className="tos-text">
            SichrPlace reserves the right to remove or suspend any listing that violates these Terms
            or that we reasonably believe to be fraudulent, misleading, or otherwise harmful.
          </p>
        </section>

        {/* ---- 5. Payments and Fees ---- */}
        <section>
          <h2 className="tos-section-title">5. Payments and Fees</h2>
          <p className="tos-text">
            Certain services on SichrPlace may involve fees, including but not limited to viewing
            request deposits, booking fees, or subscription charges for landlord accounts. All applicable
            fees will be clearly disclosed before you are required to pay.
          </p>
          <p className="tos-text">
            Payments on the Platform are processed exclusively through third-party payment providers,
            including Stripe and PayPal. SichrPlace does not store full credit or debit card numbers on
            its servers. All payment data is handled directly by these providers in accordance with their
            own security standards and privacy policies.
          </p>
          <p className="tos-text">
            By making a payment through the Platform, you agree to the terms and conditions of the
            applicable payment provider. SichrPlace is not responsible for errors, delays, or failures
            caused by third-party payment processors.
          </p>
          <p className="tos-text">
            Refund policies, where applicable, will be communicated at the time of transaction. Disputes
            regarding payments should be directed to our support team, who will work to resolve the
            matter in a fair and timely manner.
          </p>
        </section>

        {/* ---- 6. Prohibited Activities ---- */}
        <section>
          <h2 className="tos-section-title">6. Prohibited Activities</h2>
          <p className="tos-text">You agree not to engage in any of the following activities:</p>
          <ol className="tos-list">
            <li className="tos-list-item">
              Using the Platform for any unlawful purpose or in violation of any applicable law or
              regulation.
            </li>
            <li className="tos-list-item">
              Posting false, misleading, or fraudulent listing information.
            </li>
            <li className="tos-list-item">
              Impersonating another person or entity, or misrepresenting your affiliation with any person
              or entity.
            </li>
            <li className="tos-list-item">
              Interfering with or disrupting the Platform, its servers, or its connected networks.
            </li>
            <li className="tos-list-item">
              Attempting to gain unauthorized access to any part of the Platform or other users&apos;
              accounts.
            </li>
            <li className="tos-list-item">
              Scraping, harvesting, or collecting data from the Platform without prior written consent.
            </li>
            <li className="tos-list-item">
              Transmitting harmful code, including viruses, malware, or any other destructive content.
            </li>
            <li className="tos-list-item">
              Harassing, threatening, or abusing other users through the Platform&apos;s messaging or
              communication features.
            </li>
          </ol>
        </section>

        {/* ---- 7. Intellectual Property ---- */}
        <section>
          <h2 className="tos-section-title">7. Intellectual Property</h2>
          <p className="tos-text">
            All content, design, graphics, trademarks, and other materials on the Platform
            (&quot;SichrPlace Content&quot;) are the property of SichrPlace or its licensors and are
            protected by applicable intellectual property laws. You may not copy, reproduce, distribute,
            or create derivative works from SichrPlace Content without our prior written consent.
          </p>
          <p className="tos-text">
            By submitting content to the Platform (such as listing descriptions, photographs, or
            reviews), you grant SichrPlace a non-exclusive, worldwide, royalty-free license to use,
            display, and distribute that content in connection with the operation of the Platform.
          </p>
        </section>

        {/* ---- 8. Disclaimers ---- */}
        <section>
          <h2 className="tos-section-title">8. Disclaimers and Limitation of Liability</h2>
          <p className="tos-text">
            The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. SichrPlace
            makes no warranties, express or implied, regarding the Platform&apos;s availability,
            reliability, accuracy, or suitability for any particular purpose.
          </p>
          <p className="tos-text">
            SichrPlace acts as an intermediary and is not a party to any rental agreement between
            landlords and tenants. We do not guarantee the quality, safety, legality, or suitability of
            any listed property, nor do we guarantee the conduct of any user.
          </p>
          <p className="tos-text">
            To the maximum extent permitted by applicable law, SichrPlace shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from or related to
            your use of the Platform, including but not limited to loss of data, revenue, profits, or
            business opportunities.
          </p>
        </section>

        {/* ---- 9. Indemnification ---- */}
        <section>
          <h2 className="tos-section-title">9. Indemnification</h2>
          <p className="tos-text">
            You agree to indemnify, defend, and hold harmless SichrPlace, its officers, directors,
            employees, agents, and affiliates from and against any claims, liabilities, damages, losses,
            costs, or expenses (including reasonable legal fees) arising out of or related to:
          </p>
          <ul className="tos-list">
            <li className="tos-list-item">Your violation of these Terms.</li>
            <li className="tos-list-item">Your use or misuse of the Platform.</li>
            <li className="tos-list-item">
              Any content you submit or transmit through the Platform.
            </li>
            <li className="tos-list-item">
              Your violation of any applicable law, regulation, or third-party right.
            </li>
          </ul>
        </section>

        {/* ---- 10. Termination ---- */}
        <section>
          <h2 className="tos-section-title">10. Termination and Suspension</h2>
          <p className="tos-text">
            SichrPlace reserves the right to suspend or terminate your account at any time, with or
            without notice, if we reasonably believe that you have violated these Terms or engaged in
            conduct that is harmful to other users or the Platform.
          </p>
          <p className="tos-text">
            You may also terminate your account at any time by contacting our support team. Upon
            termination, your right to access the Platform will cease immediately. Provisions of these
            Terms that by their nature should survive termination (such as intellectual property,
            disclaimers, indemnification, and limitation of liability) shall continue to apply.
          </p>
        </section>

        {/* ---- 11. Governing Law ---- */}
        <section>
          <h2 className="tos-section-title">11. Governing Law and Jurisdiction</h2>
          <p className="tos-text">
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which SichrPlace is incorporated, without regard to its conflict of law
            provisions. Any disputes arising out of or relating to these Terms or the Platform shall be
            resolved in the competent courts of that jurisdiction.
          </p>
          <p className="tos-text">
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall
            be limited or eliminated to the minimum extent necessary, and the remaining provisions shall
            continue in full force and effect.
          </p>
        </section>

        {/* ---- 12. Changes ---- */}
        <section>
          <h2 className="tos-section-title">12. Changes to These Terms</h2>
          <p className="tos-text">
            SichrPlace may revise these Terms from time to time. When we make material changes, we will
            update the &quot;Last updated&quot; date at the top of this page and may provide additional
            notice through the Platform. Your continued use of the Platform after such changes
            constitutes your acceptance of the revised Terms.
          </p>
          <p className="tos-text">
            We encourage you to review these Terms periodically to stay informed of any updates.
          </p>
        </section>

        {/* ---- 13. Contact ---- */}
        <section>
          <h2 className="tos-section-title">13. Contact Information</h2>
          <p className="tos-text">
            If you have any questions or concerns about these Terms, please contact us:
          </p>
          <ul className="tos-list">
            <li className="tos-list-item">Email: legal@sichrplace.com</li>
            <li className="tos-list-item">
              You may also reach us through the contact form available on our website.
            </li>
          </ul>
        </section>
      </main>

      {/* ======= Footer ======= */}
      <footer className="tos-footer">
        <p>&copy; {new Date().getFullYear()} SichrPlace. All rights reserved.</p>
        <nav>
          <Link href="/privacy-policy" className="tos-footer-link">Privacy Policy</Link>
          <Link href="/" className="tos-footer-link">Home</Link>
        </nav>
      </footer>
    </div>
  )
}
