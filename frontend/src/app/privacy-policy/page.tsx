import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'

export default function PrivacyPolicyPage() {
  return (
    <div className="pp-layout">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="pp-main">
        <h1 className="pp-title">Privacy Policy</h1>
        <p className="pp-subtitle">Last updated: February 2026</p>

        {/* ---- Introduction ---- */}
        <section>
          <h2 className="pp-section-title">1. Introduction</h2>
          <p className="pp-text">
            Welcome to SichrPlace. We value your privacy and are committed to protecting your personal
            data. This Privacy Policy explains how we collect, use, store, and share information when
            you use the SichrPlace platform, including our website, services, and any related
            applications.
          </p>
          <p className="pp-text">
            By accessing or using our services, you acknowledge that you have read and understood this
            policy. If you do not agree with our practices, please refrain from using the platform.
          </p>
        </section>

        {/* ---- Data Controller ---- */}
        <section>
          <h2 className="pp-section-title">2. Data Controller and Contact</h2>
          <p className="pp-text">
            SichrPlace is the data controller responsible for processing your personal data under
            applicable data protection legislation. If you have questions or concerns about this policy
            or your data, you may contact us at:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">Email: privacy@sichrplace.com</li>
            <li className="pp-list-item">Postal address: SichrPlace, Privacy Team, [Company Address]</li>
          </ul>
        </section>

        {/* ---- What Data We Collect ---- */}
        <section>
          <h2 className="pp-section-title">3. What Data We Collect</h2>
          <p className="pp-text">
            We may collect the following categories of personal data when you interact with SichrPlace:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">
              <strong>Account information:</strong> name, email address, phone number, password (hashed),
              profile image, and account role (tenant, landlord, or administrator).
            </li>
            <li className="pp-list-item">
              <strong>Property listing data:</strong> property descriptions, photographs, addresses,
              pricing, and availability provided by landlords.
            </li>
            <li className="pp-list-item">
              <strong>Viewing and booking requests:</strong> requested dates, times, preferences,
              applicant details, and communication messages exchanged via the platform.
            </li>
            <li className="pp-list-item">
              <strong>Payment information:</strong> transaction identifiers and payment method details
              processed through third-party payment providers (Stripe, PayPal). We do not store full
              credit card numbers on our servers.
            </li>
            <li className="pp-list-item">
              <strong>Usage data:</strong> pages visited, search queries, browser type, device
              information, IP address, and timestamps.
            </li>
            <li className="pp-list-item">
              <strong>Communications:</strong> messages sent through the in-platform messaging system,
              support tickets, and feedback submissions.
            </li>
          </ul>
        </section>

        {/* ---- How We Use Your Data ---- */}
        <section>
          <h2 className="pp-section-title">4. How We Use Your Data</h2>
          <p className="pp-text">We use the information we collect for the following purposes:</p>
          <ul className="pp-list">
            <li className="pp-list-item">To create and manage your account on SichrPlace.</li>
            <li className="pp-list-item">
              To facilitate apartment searches, viewing requests, and booking processes between tenants
              and landlords.
            </li>
            <li className="pp-list-item">
              To process payments securely through our integrated payment providers.
            </li>
            <li className="pp-list-item">
              To send transactional notifications such as booking confirmations, viewing reminders, and
              account-related alerts.
            </li>
            <li className="pp-list-item">
              To improve and develop our platform, including analyzing usage patterns and conducting
              internal analytics.
            </li>
            <li className="pp-list-item">
              To respond to customer support inquiries and resolve disputes.
            </li>
            <li className="pp-list-item">
              To comply with legal obligations and enforce our Terms of Service.
            </li>
          </ul>
        </section>

        {/* ---- Legal Bases ---- */}
        <section>
          <h2 className="pp-section-title">5. Legal Bases for Processing</h2>
          <p className="pp-text">
            We process your personal data on the following legal grounds, as applicable:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">
              <strong>Contractual necessity:</strong> processing required to provide the services you
              have requested (e.g., managing bookings, processing payments).
            </li>
            <li className="pp-list-item">
              <strong>Consent:</strong> where you have given explicit consent, such as subscribing to
              marketing communications.
            </li>
            <li className="pp-list-item">
              <strong>Legitimate interests:</strong> to improve our services, prevent fraud, and ensure
              platform security, provided these interests do not override your fundamental rights.
            </li>
            <li className="pp-list-item">
              <strong>Legal obligation:</strong> to comply with applicable laws, regulations, or court
              orders.
            </li>
          </ul>
        </section>

        {/* ---- Cookies and Tracking ---- */}
        <section>
          <h2 className="pp-section-title">6. Cookies and Tracking</h2>
          <p className="pp-text">
            SichrPlace may use cookies and similar tracking technologies to enhance your experience. These
            may include:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">
              <strong>Essential cookies:</strong> necessary for the platform to function correctly (e.g.,
              session management, authentication tokens).
            </li>
            <li className="pp-list-item">
              <strong>Analytics cookies:</strong> used to understand how visitors interact with our
              platform so we can improve it.
            </li>
            <li className="pp-list-item">
              <strong>Preference cookies:</strong> used to remember your settings and choices, such as
              language preferences.
            </li>
          </ul>
          <p className="pp-text">
            You may manage or disable cookies through your browser settings. Please note that disabling
            certain cookies may affect the functionality of the platform.
          </p>
        </section>

        {/* ---- Third-Party Services ---- */}
        <section>
          <h2 className="pp-section-title">7. Third-Party Services</h2>
          <p className="pp-text">
            We work with trusted third-party providers to deliver certain features. These may include:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">
              <strong>Payment processors:</strong> Stripe and PayPal handle payment transactions. Your
              payment data is subject to their respective privacy policies.
            </li>
            <li className="pp-list-item">
              <strong>Hosting and infrastructure:</strong> cloud service providers that store and process
              data on our behalf under appropriate data processing agreements.
            </li>
            <li className="pp-list-item">
              <strong>Analytics providers:</strong> tools that help us measure site performance and usage
              trends.
            </li>
          </ul>
          <p className="pp-text">
            We strive to ensure that all third-party processors maintain adequate data protection
            standards and handle your information responsibly.
          </p>
        </section>

        {/* ---- Data Retention ---- */}
        <section>
          <h2 className="pp-section-title">8. Data Retention</h2>
          <p className="pp-text">
            We retain your personal data only for as long as necessary to fulfil the purposes outlined in
            this policy, or as required by applicable law. When your data is no longer needed, we will
            securely delete or anonymize it.
          </p>
          <p className="pp-text">
            Account data is generally retained for the duration of your active account. After account
            deletion, certain records (such as transaction history) may be retained for a limited period
            to comply with legal, tax, or regulatory obligations.
          </p>
        </section>

        {/* ---- Your Rights ---- */}
        <section>
          <h2 className="pp-section-title">9. Your Rights</h2>
          <p className="pp-text">
            Depending on your jurisdiction, you may have the following rights regarding your personal
            data:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">
              <strong>Access:</strong> request a copy of the personal data we hold about you.
            </li>
            <li className="pp-list-item">
              <strong>Rectification:</strong> request correction of inaccurate or incomplete data.
            </li>
            <li className="pp-list-item">
              <strong>Erasure:</strong> request deletion of your personal data, subject to legal
              retention obligations.
            </li>
            <li className="pp-list-item">
              <strong>Restriction:</strong> request that we limit the processing of your data under
              certain circumstances.
            </li>
            <li className="pp-list-item">
              <strong>Data portability:</strong> request your data in a structured, commonly used,
              machine-readable format.
            </li>
            <li className="pp-list-item">
              <strong>Objection:</strong> object to processing based on legitimate interests or direct
              marketing.
            </li>
            <li className="pp-list-item">
              <strong>Withdraw consent:</strong> where processing is based on consent, you may withdraw
              it at any time without affecting the lawfulness of prior processing.
            </li>
          </ul>
          <p className="pp-text">
            To exercise any of these rights, please contact us at privacy@sichrplace.com. We will respond
            within the timeframe required by applicable law.
          </p>
        </section>

        {/* ---- International Transfers ---- */}
        <section>
          <h2 className="pp-section-title">10. International Transfers</h2>
          <p className="pp-text">
            Your personal data may be transferred to and processed in countries other than your country of
            residence. In such cases, we take appropriate measures to ensure that your data is protected
            in accordance with applicable data protection laws, including the use of standard contractual
            clauses or other approved transfer mechanisms.
          </p>
        </section>

        {/* ---- Changes to This Policy ---- */}
        <section>
          <h2 className="pp-section-title">11. Changes to This Policy</h2>
          <p className="pp-text">
            We may update this Privacy Policy from time to time to reflect changes in our practices,
            technologies, legal requirements, or other factors. When we make material changes, we will
            notify you by updating the &quot;Last updated&quot; date at the top of this page and, where
            appropriate, through additional notice on the platform.
          </p>
          <p className="pp-text">
            We encourage you to review this policy periodically to stay informed about how we protect
            your information.
          </p>
        </section>

        {/* ---- Contact ---- */}
        <section>
          <h2 className="pp-section-title">12. Contact for Privacy Questions</h2>
          <p className="pp-text">
            If you have any questions, concerns, or requests related to this Privacy Policy or your
            personal data, please reach out to us:
          </p>
          <ul className="pp-list">
            <li className="pp-list-item">Email: privacy@sichrplace.com</li>
            <li className="pp-list-item">
              You may also use the contact form available on our website to submit your inquiry.
            </li>
          </ul>
        </section>
      </main>

      {/* ======= Footer ======= */}
      <footer className="pp-footer">
        <p>&copy; {new Date().getFullYear()} SichrPlace. All rights reserved.</p>
        <nav>
          <Link href="/terms" className="pp-footer-link">Terms of Service</Link>
          <Link href="/" className="pp-footer-link">Home</Link>
        </nav>
      </footer>
    </div>
  )
}
