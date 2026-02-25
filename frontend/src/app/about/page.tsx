import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'

export default function AboutPage() {
  return (
    <div className="about-layout">
      {/* ======= Header ======= */}
      <SiteHeader />

      <main className="about-main">
        {/* ======= Hero ======= */}
        <section className="about-hero">
          <div className="about-hero-content">
            <h1 className="about-hero-title">About SichrPlace</h1>
            <p className="about-hero-subtitle">
              A secure, data-respecting rental marketplace built for trust.
            </p>
            <p className="about-hero-text">
              SichrPlace connects tenants and landlords across Germany through
              a platform that prioritises privacy, fairness, and fraud prevention.
              Every interaction, from browsing listings to signing a lease, is
              designed with security at its core and respect for your data as
              a non-negotiable principle.
            </p>
          </div>
          <div className="about-hero-visual" aria-hidden="true" />
        </section>

        {/* ======= Mission & Vision ======= */}
        <section className="about-section">
          <div className="about-section-grid">
            <div>
              <h2 className="about-section-title">Our Mission</h2>
              <p className="about-section-text">
                We help tenants find trustworthy homes and landlords find reliable
                tenants. By reducing friction, eliminating hidden fees, and
                verifying every participant, SichrPlace makes the rental process
                transparent and safe for everyone involved.
              </p>
              <p className="about-section-text">
                Scams, discrimination, and opaque pricing have plagued the rental
                market for too long. Our mission is to replace these pain points
                with a fair, rules-based system backed by technology.
              </p>
            </div>
            <div>
              <h2 className="about-section-title">Our Vision</h2>
              <p className="about-section-text">
                We are building the most trusted rental platform in Europe: a
                privacy-first marketplace with transparent pricing where tenants
                and landlords meet on equal footing.
              </p>
              <p className="about-section-text">
                Our long-term goal is to set a new industry standard for how
                rental platforms handle personal data, verify identities, and
                mediate disputes, all while keeping the user experience simple
                and accessible.
              </p>
            </div>
          </div>
        </section>

        {/* ======= How SichrPlace Works ======= */}
        <section className="about-section">
          <h2 className="about-section-title">How SichrPlace Works</h2>
          <div className="about-steps">
            <div className="about-step">
              <i className="fa-solid fa-user-plus about-step-icon" />
              <h3 className="about-step-title">Create Your Account</h3>
              <p className="about-step-text">
                Sign up with your email and verify your identity. Your data is
                encrypted from the very first step.
              </p>
            </div>
            <div className="about-step">
              <i className="fa-solid fa-address-card about-step-icon" />
              <h3 className="about-step-title">Build Your Profile</h3>
              <p className="about-step-text">
                Set your preferences, lifestyle details, and search criteria so
                we can match you with the best options.
              </p>
            </div>
            <div className="about-step">
              <i className="fa-solid fa-magnifying-glass about-step-icon" />
              <h3 className="about-step-title">List or Search</h3>
              <p className="about-step-text">
                Landlords list verified properties with photos and floor plans.
                Tenants browse, filter, and save their favourites.
              </p>
            </div>
            <div className="about-step">
              <i className="fa-solid fa-handshake about-step-icon" />
              <h3 className="about-step-title">Book with Confidence</h3>
              <p className="about-step-text">
                Schedule viewings, communicate securely, and finalise agreements
                through our integrated payment and signing flow.
              </p>
            </div>
          </div>
        </section>

        {/* ======= Why SichrPlace is Different ======= */}
        <section className="about-section">
          <h2 className="about-section-title">Why SichrPlace is Different</h2>
          <div className="about-features">
            <div className="about-feature">
              <h3 className="about-feature-title">
                <i className="fa-solid fa-shield-halved" /> Security by Design
              </h3>
              <p className="about-feature-text">
                Multi-layered security including HTTPS everywhere, CSRF
                protection, verified email addresses, and rate-limited APIs
                ensures your account and data stay safe at every layer.
              </p>
            </div>
            <div className="about-feature">
              <h3 className="about-feature-title">
                <i className="fa-solid fa-scale-balanced" /> Fairness for Everyone
              </h3>
              <p className="about-feature-text">
                Transparent processes and clear rules level the playing field.
                Both tenants and landlords know exactly what to expect at every
                stage of the rental journey.
              </p>
            </div>
            <div className="about-feature">
              <h3 className="about-feature-title">
                <i className="fa-solid fa-lock" /> GDPR-First Platform
              </h3>
              <p className="about-feature-text">
                Your privacy is not an afterthought. Export or delete your data
                at any time, manage cookie preferences, and control exactly what
                information you share via your{' '}
                <Link href="/privacy-policy">privacy settings</Link>.
              </p>
            </div>
            <div className="about-feature">
              <h3 className="about-feature-title">
                <i className="fa-solid fa-credit-card" /> Integrated Payments
              </h3>
              <p className="about-feature-text">
                Secure Stripe and PayPal integration means payments are handled
                by industry-leading providers. No cash handoffs, no wire-transfer
                scams, just reliable, traceable transactions.
              </p>
            </div>
          </div>
        </section>

        {/* ======= For Tenants / For Landlords ======= */}
        <section className="about-section">
          <div className="about-audience">
            <div className="about-audience-card">
              <h3 className="about-audience-title">
                <i className="fa-solid fa-house-user" /> For Tenants
              </h3>
              <ul className="about-audience-list">
                <li className="about-audience-item">
                  <i className="fa-solid fa-circle-check" /> Find safe, verified housing across Germany
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-sliders" /> Lifestyle-based profile matching
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-calendar-check" /> Transparent viewing and booking process
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-file-signature" /> Digital agreements with audit trail
                </li>
              </ul>
            </div>
            <div className="about-audience-card">
              <h3 className="about-audience-title">
                <i className="fa-solid fa-building" /> For Landlords
              </h3>
              <ul className="about-audience-list">
                <li className="about-audience-item">
                  <i className="fa-solid fa-user-check" /> High-quality, pre-verified applicants
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-chart-line" /> Dashboard overview of all properties
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-wallet" /> Secure payments via Stripe and PayPal
                </li>
                <li className="about-audience-item">
                  <i className="fa-solid fa-list-check" /> Viewing and booking management tools
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ======= Our Story ======= */}
        <section className="about-story">
          <h2 className="about-story-title">Our Story</h2>
          <p className="about-story-text">
            SichrPlace was born from real frustration. After encountering scam
            listings, unresponsive landlords, and platforms that treated tenant
            data as a commodity, we decided to build something better. The
            earlier SichrSpace prototype proved the concept; SichrPlace is the
            production-grade, security-hardened marketplace that grew from those
            lessons.
          </p>
          <p className="about-story-text">
            Every line of code, every design decision, and every policy is driven
            by a simple conviction: the rental market can be fair, transparent,
            and respectful of the people who use it.
          </p>
          <ul className="about-values">
            <li className="about-value-item">
              <i className="fa-solid fa-shield" /> Security
            </li>
            <li className="about-value-item">
              <i className="fa-solid fa-eye" /> Transparency
            </li>
            <li className="about-value-item">
              <i className="fa-solid fa-user-shield" /> Respect for Privacy
            </li>
          </ul>
        </section>

        {/* ======= CTA ======= */}
        <section className="about-cta">
          <h2 className="about-cta-title">Ready to get started?</h2>
          <div className="about-cta-buttons">
            <Link href="/offer" className="about-cta-primary">
              Find Your Next Home
            </Link>
            <Link href="/add-property" className="about-cta-secondary">
              List Your Property
            </Link>
          </div>
          <div className="about-cta-links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </section>
      </main>

      {/* ======= Footer ======= */}
      <footer className="about-footer">
        <LogoLink size={36} />
        <p className="about-footer-copy">
          &copy; {new Date().getFullYear()} SichrPlace. All rights reserved.
        </p>
        <nav className="about-footer-nav">
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/about">About</Link>
        </nav>
      </footer>
    </div>
  )
}
