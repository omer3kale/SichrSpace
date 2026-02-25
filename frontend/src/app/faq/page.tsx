import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'

export default function FaqPage() {
  return (
    <div className="faq-layout">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="faq-page">
        {/* ======= Hero ======= */}
        <section className="faq-hero">
          <h1 className="faq-hero-title">Frequently Asked Questions</h1>
          <p className="faq-hero-subtitle">
            Find answers to common questions about accounts, security, bookings,
            payments, and how SichrPlace handles your data under GDPR.
          </p>
        </section>

        {/* ======= General ======= */}
        <section className="faq-section">
          <h2 className="faq-section-title">
            <i className="fa-solid fa-circle-info faq-section-icon" />
            General
          </h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">What is SichrPlace?</h3>
              <p className="faq-answer">
                SichrPlace is a secure rental marketplace that connects tenants and
                landlords across Germany. The platform is built around trust, privacy,
                and fraud prevention so every interaction, from browsing listings to
                signing a lease, is safe and transparent.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Where is SichrPlace available?</h3>
              <p className="faq-answer">
                SichrPlace currently operates in Germany. We are working toward
                expanding to additional European markets in the near future.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Is SichrPlace free to use?</h3>
              <p className="faq-answer">
                Browsing apartment listings and creating an account are completely free.
                Fees may apply for premium features such as promoted listings or
                booking-related services; these are always shown clearly before you
                confirm.
              </p>
            </div>
          </div>
        </section>

        {/* ======= Accounts & Security ======= */}
        <section className="faq-section">
          <h2 className="faq-section-title">
            <i className="fa-solid fa-shield-halved faq-section-icon" />
            Accounts &amp; Security
          </h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">Do I need an account to use SichrPlace?</h3>
              <p className="faq-answer">
                You can browse listings without an account. However, to send messages,
                request viewings, or make bookings you will need to create a free
                account as either a tenant or a landlord.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">How do you keep my account secure?</h3>
              <p className="faq-answer">
                All connections are encrypted over HTTPS. We use secure login tokens,
                enforce strong password requirements, and add additional backend
                security layers to protect your credentials and personal data.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">What happens if I forget my password?</h3>
              <p className="faq-answer">
                Visit the <Link href="/forgot-password" className="faq-link">Forgot Password</Link> page
                to request a reset link. You will receive an email with a secure link
                that lets you create a new password.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I be both a tenant and a landlord?</h3>
              <p className="faq-answer">
                Each account is tied to a single role (tenant or landlord) for security
                and fraud-prevention purposes. If you need both roles, you must use
                separate accounts with different email addresses.
              </p>
            </div>
          </div>
        </section>

        {/* ======= Bookings & Payments ======= */}
        <section className="faq-section">
          <h2 className="faq-section-title">
            <i className="fa-solid fa-credit-card faq-section-icon" />
            Bookings &amp; Payments
          </h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">How do bookings work?</h3>
              <p className="faq-answer">
                Browse available apartments, request a viewing, and once the landlord
                accepts you can confirm the booking and proceed to payment. The entire
                flow is handled through the platform so both parties have a clear
                record of every step.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Which payment methods are supported?</h3>
              <p className="faq-answer">
                SichrPlace supports payments through Stripe and PayPal. You can choose
                whichever provider suits you at checkout; both options are fully
                integrated into the platform.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Are my payments secure?</h3>
              <p className="faq-answer">
                Yes. Payments are processed entirely by Stripe or PayPal. SichrPlace
                never stores your card details or bank information. Both providers are
                PCI-DSS compliant and use industry-standard encryption.
              </p>
            </div>
          </div>
        </section>

        {/* ======= Privacy & GDPR ======= */}
        <section className="faq-section">
          <h2 className="faq-section-title">
            <i className="fa-solid fa-lock faq-section-icon" />
            Privacy &amp; GDPR
          </h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">How do you handle my data?</h3>
              <p className="faq-answer">
                We collect only what is necessary to operate the platform and we
                process it in full compliance with the EU General Data Protection
                Regulation (GDPR). For complete details, read our{' '}
                <Link href="/privacy-policy" className="faq-link">Privacy Policy</Link>.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I export my data?</h3>
              <p className="faq-answer">
                Yes. You can request a full export of your personal data from the{' '}
                <Link href="/privacy-settings" className="faq-link">Privacy Settings</Link>{' '}
                page in your account. We will provide the export in a standard,
                machine-readable format as required by GDPR.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I delete my account?</h3>
              <p className="faq-answer">
                Absolutely. You can request account deletion from your{' '}
                <Link href="/privacy-settings" className="faq-link">Privacy Settings</Link>.
                Deletion is processed according to GDPR timelines, and we will confirm
                once your data has been fully removed from our systems.
              </p>
            </div>
          </div>
        </section>

        {/* ======= Contact / Support CTA ======= */}
        <section className="faq-cta">
          <h2 className="faq-cta-title">Still have questions?</h2>
          <p className="faq-cta-text">
            If you could not find what you were looking for, our support team is
            happy to help. Reach out and we will get back to you as soon as
            possible.
          </p>
          <div className="faq-cta-buttons">
            <Link href="/customer-service" className="faq-cta-primary">
              <i className="fa-solid fa-headset" /> Contact Support
            </Link>
            <Link href="/privacy-policy" className="faq-cta-secondary">
              Privacy Policy
            </Link>
          </div>
        </section>
      </main>

      {/* ======= Footer ======= */}
      <footer className="faq-footer">
        <LogoLink size={36} />
        <p className="faq-footer-copy">
          &copy; {new Date().getFullYear()} SichrPlace. All rights reserved.
        </p>
        <nav className="faq-footer-nav">
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/about">About</Link>
          <Link href="/">Home</Link>
        </nav>
      </footer>
    </div>
  )
}
