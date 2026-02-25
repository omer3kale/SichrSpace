'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import Script from 'next/script'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { PaymentOptions } from '@/components/PaymentOptions'

/* --------------------------------------------------------------------
   SichrPlace Landing Page - Next.js App-Router recreation of the
   original static index.html.  All sections, content and ordering
   are preserved.  Interactive behaviour reimplemented with React
   hooks instead of vanilla JS.
   -------------------------------------------------------------------- */

interface ViewingFormData {
  apartmentId: string
  viewingDate: string
  viewingTime: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  questions: string
  attentionPoints: string
}

const INITIAL_VIEWING_FORM: ViewingFormData = {
  apartmentId: '',
  viewingDate: '',
  viewingTime: '',
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  questions: '',
  attentionPoints: '',
}

export default function Home() {
  /* -- state -------------------------------------------------------- */
  const [currentSlide, setCurrentSlide] = useState(0)
  const [wishlist, setWishlist] = useState<Record<number, boolean>>({})
  const [opinions, setOpinions] = useState<string[]>([])
  const [opinionText, setOpinionText] = useState('')
  const [csName, setCsName] = useState('')
  const [csEmail, setCsEmail] = useState('')
  const [csMessage, setCsMessage] = useState('')
  const [csStatus, setCsStatus] = useState('')
  const [viewingModalOpen, setViewingModalOpen] = useState(false)
  const [paypalModalOpen, setPaypalModalOpen] = useState(false)
  const [viewingForm, setViewingForm] = useState<ViewingFormData>(INITIAL_VIEWING_FORM)

  const totalSlides = 4

  /* -- helpers ------------------------------------------------------ */
  const showSlide = useCallback((idx: number) => setCurrentSlide(idx), [])
  const toggleWishlist = useCallback(
    (id: number) => setWishlist((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  )
  const todayISO = new Date().toISOString().split('T')[0]

  const handleOpinionSubmit = (e: FormEvent) => {
    e.preventDefault()
    const text = opinionText.trim()
    if (text) {
      setOpinions((prev) => [text, ...prev])
      setOpinionText('')
    }
  }

  const handleCsSubmit = (e: FormEvent) => {
    e.preventDefault()
    setCsStatus('Your message has been sent. Our team will contact you soon!')
    setCsName('')
    setCsEmail('')
    setCsMessage('')
  }

  const openViewingModal = () => setViewingModalOpen(true)
  const closeViewingModal = () => {
    setViewingModalOpen(false)
    setViewingForm(INITIAL_VIEWING_FORM)
  }
  const closePaypalModal = () => setPaypalModalOpen(false)

  const handleViewingSubmit = (e: FormEvent) => {
    e.preventDefault()
    const { apartmentId, viewingDate, viewingTime, applicantName, applicantEmail, applicantPhone } = viewingForm
    if (!apartmentId || !viewingDate || !viewingTime || !applicantName || !applicantEmail || !applicantPhone) {
      alert('Please fill in all required fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail)) {
      alert('Please enter a valid email address.')
      return
    }
    const selected = new Date(viewingDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selected < today) {
      alert('Please select a future date for the viewing.')
      return
    }
    setViewingModalOpen(false)
    setPaypalModalOpen(true)
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  /* -- render ------------------------------------------------------- */
  return (
    <>
      {/* ======= Header ======= */}
      <SiteHeader />

      {/* ======= Viewing Request Modal ======= */}
      {viewingModalOpen && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 600, width: '95vw', maxHeight: '90vh', overflowY: 'auto', padding: '32px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', position: 'relative' }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#2563eb', textAlign: 'center', marginBottom: 24 }}>
              <i className="fa fa-calendar-check" /> Apartment Viewing Request
            </div>
            <button onClick={closeViewingModal} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: '1.5rem', color: '#e11d48', cursor: 'pointer' }}>&times;</button>

            <form onSubmit={handleViewingSubmit} style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Apartment ID *</label>
                <input type="text" required placeholder="Enter the Apartment ID from our platform" value={viewingForm.apartmentId} onChange={(e) => setViewingForm((f) => ({ ...f, apartmentId: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
                <small style={{ color: '#6b7280', fontSize: 13 }}>Find the Apartment ID on the apartment listing page</small>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Viewing Date *</label>
                  <input type="date" required min={todayISO} value={viewingForm.viewingDate} onChange={(e) => setViewingForm((f) => ({ ...f, viewingDate: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Preferred Time *</label>
                  <input type="time" required value={viewingForm.viewingTime} onChange={(e) => setViewingForm((f) => ({ ...f, viewingTime: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Your Name *</label>
                <input type="text" required placeholder="Enter your full name" value={viewingForm.applicantName} onChange={(e) => setViewingForm((f) => ({ ...f, applicantName: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Email Address *</label>
                <input type="email" required placeholder="Enter your email address" value={viewingForm.applicantEmail} onChange={(e) => setViewingForm((f) => ({ ...f, applicantEmail: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Phone Number *</label>
                <input type="tel" required placeholder="Enter your phone number" value={viewingForm.applicantPhone} onChange={(e) => setViewingForm((f) => ({ ...f, applicantPhone: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>Questions or Special Requests</label>
                <textarea placeholder="Any questions about the apartment or special requests for the viewing?" value={viewingForm.questions} onChange={(e) => setViewingForm((f) => ({ ...f, questions: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, color: '#374151' }}>What should we pay attention to during the viewing?</label>
                <textarea placeholder="Specific areas or aspects you'd like our team to focus on..." value={viewingForm.attentionPoints} onChange={(e) => setViewingForm((f) => ({ ...f, attentionPoints: e.target.value }))} style={{ width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, minHeight: 80, resize: 'vertical' }} />
              </div>
              <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#2563eb', fontSize: 16 }}>
                  <i className="fa fa-info-circle" /> Viewing Service Fee
                </h4>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                  Our professional viewing service includes a detailed property inspection, video documentation, and expert evaluation.
                  A service fee of <strong>&euro;25.00</strong> is required to proceed with your viewing request.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={closeViewingModal} style={{ flex: 1, padding: 12, background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 2, padding: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Continue to Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= Payment Modal (Stripe + PayPal) ======= */}
      {paypalModalOpen && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 10000, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, maxWidth: 500, width: '95vw', padding: '32px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', position: 'relative' }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#2563eb', textAlign: 'center', marginBottom: 24 }}>
              <i className="fa fa-credit-card" /> Complete Payment
            </div>
            <button onClick={closePaypalModal} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: '1.5rem', color: '#e11d48', cursor: 'pointer' }}>&times;</button>

            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#374151' }}>Viewing Request Summary</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Apartment ID:</span>
                <span style={{ fontWeight: 600 }}>{viewingForm.apartmentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Viewing Date:</span>
                <span style={{ fontWeight: 600 }}>{viewingForm.viewingDate ? formatDate(viewingForm.viewingDate) : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Viewing Time:</span>
                <span style={{ fontWeight: 600 }}>{viewingForm.viewingTime}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 12 }}>
                <span style={{ fontWeight: 600 }}>Service Fee:</span>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>&euro;25.00</span>
              </div>
            </div>

            <PaymentOptions
              amount={25.0}
              currency="EUR"
              description="Apartment viewing service fee"
              context="viewing_payment"
            />
          </div>
        </div>
      )}

      {/* ======= Main Content ======= */}
      <main>
        {/* -- Hero Section -- */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-logo">
              <div className="sichrplace-logo hero-brand">
                <div className="sichrplace-shield xlarge sichrplace-certified" />
                <span className="sichrplace-text hero-text">SichrPlace</span>
              </div>
            </div>
            <h1>Find Your Next Apartment<br />with Confidence</h1>
            <p>Secure, transparent, and easy apartment search for students and professionals in Germany.</p>
            <form className="search-bar" action="/offer" method="get">
              <input type="text" name="q" placeholder="Search by city, address, or keyword..." aria-label="Search apartments" />
              <button type="submit"><i className="fa fa-search" /> Search</button>
            </form>
            <div className="hero-cta">
              <a href="/create-account" className="primary">Get Started</a>
              <a href="/offer">Browse Apartments</a>
            </div>
          </div>
        </section>

        {/* -- Features Section -- */}
        <section className="features">
          <div className="feature-card">
            <i className="fa fa-shield-alt" />
            <h3>Verified Listings</h3>
            <p>All apartments are checked for authenticity to protect you from scams.</p>
          </div>
          <div className="feature-card">
            <i className="fa fa-comments" />
            <h3>Secure Messaging</h3>
            <p>Chat safely with landlords and renters using our built-in messaging system.</p>
          </div>
          <div className="feature-card">
            <i className="fa fa-filter" />
            <h3>Advanced Filters</h3>
            <p>Find your perfect home with filters for price, location, facilities, and more.</p>
          </div>
          <div className="feature-card">
            <i className="fa fa-star" />
            <h3>Top Rated Apartments</h3>
            <p>See the best-rated apartments and reviews from real tenants.</p>
          </div>
        </section>

        {/* -- Customer Service, FAQ & Viewing Service -- */}
        <section className="customer-service-faq-section">
          <div className="customer-service-faq-container">
            <h2><i className="fa fa-headset" /> Customer Service, FAQ &amp; Viewing Service</h2>
            <div className="customer-service-faq-flex">
              <div>
                <h3>Frequently Asked Questions</h3>
                <ul>
                  <li><strong>How do I list a new apartment?</strong><br />Go to your dashboard and click &ldquo;Create Apartment Offer&rdquo;.</li>
                  <li><strong>How do I schedule a viewing?</strong><br />Approve a viewing request in your dashboard and follow the prompts.</li>
                  <li><strong>How do I generate a digital contract?</strong><br />Use the &ldquo;Viewing &amp; Contract&rdquo; card on your dashboard after a successful viewing.</li>
                  <li><strong>How do I contact support?</strong><br />Email us at <a href="mailto:sichrplace@gmail.com">sichrplace@gmail.com</a> or call +49 123 456789.</li>
                </ul>
              </div>
              <div>
                <h3>Viewing Service</h3>
                <p>
                  Our customer managers can conduct viewings on your behalf, record apartment videos, and assist with digital contract generation.<br />
                  To use this service, simply proceed with a viewing and select &ldquo;Generate Contract&rdquo; when ready.
                </p>
                <h3>Contact Customer Service</h3>
                <form onSubmit={handleCsSubmit}>
                  <input type="text" placeholder="Your Name" required value={csName} onChange={(e) => setCsName(e.target.value)} />
                  <input type="email" placeholder="Your Email" required value={csEmail} onChange={(e) => setCsEmail(e.target.value)} />
                  <textarea rows={3} placeholder="Your Message" required value={csMessage} onChange={(e) => setCsMessage(e.target.value)} />
                  <button type="submit">Send Message</button>
                </form>
                {csStatus && <div id="customer-service-status">{csStatus}</div>}
              </div>
            </div>
          </div>
        </section>

        {/* -- Slider Section -- */}
        <section className="slider-section">
          <div className="slider-container">
            <div className="slides" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {/* Slide 1: Top Rated Apartments */}
              <div className="slide">
                <h2>Top Rated Apartments</h2>
                <div className="top-apartments-list">
                  {[
                    { id: 0, img: 'img/apartment1.jpg', name: '123 Main St', rating: '4.8', reviews: 32, applicants: 12, interview: true },
                    { id: 1, img: 'img/apartment2.jpg', name: '456 Elm St', rating: '4.7', reviews: 21, applicants: 7, interview: false },
                    { id: 2, img: 'img/apartment3.jpg', name: '789 Oak Ave', rating: '4.9', reviews: 18, applicants: 3, interview: true },
                  ].map((apt) => (
                    <div className="apartment-card" key={apt.id}>
                      <img src={apt.img} alt={`Apartment ${apt.id + 1}`} />
                      <div className="apartment-info">
                        <strong>{apt.name}</strong>
                        <span>{'\u2B50'} {apt.rating} ({apt.reviews} reviews)</span>
                        <span className="badge">{apt.applicants} applicants</span>
                        {apt.interview && (
                          <span className="interview"><i className="fa fa-user-check" /> Interview Required</span>
                        )}
                      </div>
                      <button
                        className={`wishlist-btn${wishlist[apt.id] ? ' active' : ''}`}
                        onClick={() => toggleWishlist(apt.id)}
                        title="Add to wishlist"
                      >
                        <i className="fa fa-heart" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide 2: User Opinions */}
              <div className="slide">
                <div className="user-opinions">
                  <h2>User Opinions</h2>
                  <form id="opinion-form" onSubmit={handleOpinionSubmit}>
                    <textarea
                      id="opinion-text"
                      placeholder="Share your opinion..."
                      required
                      value={opinionText}
                      onChange={(e) => setOpinionText(e.target.value)}
                    />
                    <button type="submit">Submit</button>
                  </form>
                  <div id="opinions-list">
                    {opinions.map((o, i) => (
                      <div className="opinion-item" key={i}>{o}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide 3: Marketplace */}
              <div className="slide">
                <h2>Everyday Apartment Tools Marketplace</h2>
                <p>
                  Find and offer useful tools and services for your apartment life. <br />
                  <a href="marketplace.html" style={{ color: 'var(--primary)', fontWeight: 600 }}>Visit Marketplace</a>
                </p>
              </div>

              {/* Slide 4: Scam Story Chat Group */}
              <div className="slide">
                <h2>Tell Your Scam Story</h2>
                <p>
                  Join our public chat group to share and read scam stories. <br />
                  <a href="scam-stories.html" style={{ color: 'var(--primary)', fontWeight: 600 }}>Go to Scam Stories</a>
                </p>
              </div>
            </div>
          </div>
          <div className="slider-nav">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                className={`slider-dot${currentSlide === i ? ' active' : ''}`}
                onClick={() => showSlide(i)}
              />
            ))}
          </div>
        </section>

        {/* -- Testimonials Section -- */}
        <section className="testimonials-section" style={{ maxWidth: 950, margin: '60px auto 0 auto' }}>
          <h2 style={{ fontFamily: 'var(--heading-font)', color: 'var(--primary)', textAlign: 'center', marginBottom: 32, fontSize: '2rem', fontWeight: 700 }}>What Our Users Say</h2>
          <div className="testimonials" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, justifyContent: 'center' }}>
            {[
              { quote: '\u201CSichrPlace helped me find a safe apartment in Cologne. The process was smooth and transparent!\u201D', img: 'img/user1.jpg', name: 'Anna S.', role: 'Student' },
              { quote: '\u201CAs a landlord, I appreciate the verification and messaging tools. Highly recommended!\u201D', img: 'img/user2.jpg', name: 'Markus R.', role: 'Landlord' },
              { quote: '\u201CThe advanced filters made it easy to find exactly what I needed. Great platform!\u201D', img: 'img/user3.jpg', name: 'Fatima K.', role: 'Young Professional' },
            ].map((t, i) => (
              <div key={i} className="testimonial" style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '28px 22px', maxWidth: 320, flex: '1 1 260px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontSize: '1.08rem', color: 'var(--text)', marginBottom: 18, fontStyle: 'italic' }}>{t.quote}</p>
                <div className="user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={t.img} alt={t.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} />
                  <div className="user-info" style={{ fontFamily: 'var(--heading-font)', fontWeight: 600, color: 'var(--primary)' }}>
                    {t.name}<br />
                    <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--muted)' }}>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -- User Feedback Section -- */}
        <section className="feedback-section" style={{ maxWidth: 950, margin: '60px auto 0 auto', padding: '0 20px' }}>
          <div className="feedback-container" style={{ background: 'linear-gradient(135deg,var(--secondary) 0%,#ffffff 100%)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: '48px 40px', textAlign: 'center', border: '1px solid rgba(37,99,235,0.08)' }}>
            <div className="feedback-header" style={{ marginBottom: 32 }}>
              <div className="feedback-icon" style={{ width: 64, height: 64, background: 'linear-gradient(135deg,var(--primary) 0%,var(--accent) 100%)', borderRadius: '50%', margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(37,99,235,0.15)' }}>
                <i className="fas fa-comments" style={{ color: 'white', fontSize: 24 }} />
              </div>
              <h2 style={{ fontFamily: 'var(--heading-font)', color: 'var(--primary)', fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Share Your Experience</h2>
              <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 600, margin: '0 auto' }}>Help us improve SichrPlace by sharing your feedback. Your insights help us create a better platform for everyone in the community.</p>
            </div>

            <div className="feedback-form-container" style={{ background: 'var(--card)', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(37,99,235,0.06)' }}>
              <div className="form-preview" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: '50%' }} />
                  <span style={{ color: 'var(--primary)', fontWeight: 600, fontFamily: 'var(--heading-font)' }}>Quick Feedback Form</span>
                  <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: '50%' }} />
                </div>
                <p style={{ color: 'var(--text)', fontSize: '0.95rem' }}>Share your thoughts about our platform, features, and overall experience</p>
              </div>

              <div className="feedback-cta-primary" style={{ marginBottom: 32 }}>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSd11S_WSXvhxQgUlksFdZfvErbBZgaiKA484lsp9-sYIYK_IA/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-button"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,var(--primary) 0%,var(--accent) 100%)', color: 'white', padding: '16px 32px', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--heading-font)', fontSize: '1.1rem', boxShadow: '0 8px 20px rgba(37,99,235,0.25)', transition: 'all 0.3s ease', border: 'none', cursor: 'pointer' }}
                >
                  <i className="fas fa-external-link-alt" style={{ fontSize: 16 }} />
                  <span>Open Feedback Form</span>
                </a>
              </div>

              <div className="embedded-form" style={{ position: 'relative' }}>
                <iframe
                  src="https://docs.google.com/forms/d/e/1FAIpQLSd11S_WSXvhxQgUlksFdZfvErbBZgaiKA484lsp9-sYIYK_IA/viewform?embedded=true"
                  width="100%"
                  height={600}
                  frameBorder={0}
                  marginHeight={0}
                  marginWidth={0}
                  style={{ borderRadius: 12, background: '#ffffff', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)' }}
                  title="SichrPlace User Feedback Form"
                >
                  Loading...
                </iframe>
              </div>

              <div className="feedback-footer" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-shield-alt" style={{ color: 'var(--accent)', fontSize: 16 }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>100% Anonymous</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-clock" style={{ color: 'var(--primary)', fontSize: 16 }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Takes 2-3 minutes</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="fas fa-heart" style={{ color: '#e74c3c', fontSize: 16 }} />
                    <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Helps improve our platform</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="feedback-cta" style={{ marginTop: 32 }}>
              <p style={{ color: 'var(--text)', fontSize: '0.95rem', marginBottom: 16 }}>
                <strong>Have a specific issue or suggestion?</strong>{' '}
                <a href="customer-service.html" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, borderBottom: '2px solid var(--accent)' }}>Contact our support team</a>
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
                <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
                <span style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500 }}>Thank you for helping us grow!</span>
                <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg,transparent,var(--accent),transparent)' }} />
              </div>
            </div>
          </div>
        </section>

        {/* -- Smart Matching & Secure Payments -- */}
        <section className="matching-section">
          <h2><i className="fa fa-handshake" /> Smart Matching &amp; Secure Payments</h2>
          <ul className="matching-features-list">
            <li>
              <i className="fa fa-filter" />
              <span>
                <strong>Detailed Preferences:</strong> Both apartment searchers and landlords specify detailed preferences. Only compatible parties are matched and can see each other, ensuring relevant and efficient connections.
              </span>
            </li>
            <li>
              <i className="fa fa-clock" />
              <span>
                <strong>Auto-Deactivation:</strong> If a landlord does not interact with their offer within a set period, the listing is automatically deactivated to keep results fresh and reliable.
              </span>
            </li>
            <li>
              <i className="fa fa-euro-sign" />
              <span>
                <strong>Platform Payments:</strong> All payments - including searcher-to-company, company-to-landlord, and landlord-to-renter deposit returns - are processed exclusively through SichrPlace for maximum security and transparency.
              </span>
            </li>
          </ul>
          <div className="info">
            <i className="fa fa-info-circle" />
            <span>
              Matching and payment flows are fully automated. Conflicting or non-matching parties will not see each other, and all transactions are securely handled by the platform.
            </span>
          </div>
          <div className="payment-flow">
            <strong>How it works:</strong>
            <ol style={{ margin: '10px 0 0 18px' }}>
              <li>Apartment searchers pay the platform for booking or deposit.</li>
              <li>Landlords receive payments from the platform after successful rental agreements.</li>
              <li>Deposit repayments from landlords to renters are managed and released by SichrPlace after move-out.</li>
            </ol>
          </div>
        </section>
      </main>

      {/* ======= Social CTA Bar ======= */}
      <div className="social-cta-bar" style={{ marginTop: 40 }}>
        <span>
          <strong>Are you a landlord?</strong>{' '}
          <a href="/add-property" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            List your apartment with us and reach verified tenants!
          </a>
          <br />
          <strong>Students &amp; Young Professionals:</strong> Follow us for apartment tips, stories, and offers!
        </span>
        <div className="social-icons">
          <a href="https://www.facebook.com/sichrplace" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i className="fab fa-facebook" /></a>
          <a href="https://www.instagram.com/sichrplace" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i className="fab fa-instagram" /></a>
          <a href="https://www.tiktok.com/@sichrplace" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i className="fab fa-tiktok" /></a>
        </div>
      </div>

      {/* ======= SEO Hidden Content ======= */}
      <div style={{ display: 'none' }}>
        student apartments Cologne, safe student housing Aachen, verified student rentals Germany, young professional apartments Cologne, secure rentals for professionals Aachen, digital nomad housing Germany, list my apartment Cologne, safe landlord platform Germany, tenant screening Germany, apartments near University of Cologne, Aachen student flats
      </div>

      {/* ======= JSON-LD Structured Data ======= */}
      <Script id="jsonld-website" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'SichrPlace',
        url: 'https://sichrplace.com/',
        description: 'Find safe, verified apartments for students and young professionals in Germany. Secure messaging, trusted landlords, and exclusive offers for AIESEC and university students.',
        keywords: [
          'student apartments Cologne',
          'safe student housing Aachen',
          'verified student rentals Germany',
          'young professional apartments Cologne',
          'secure rentals for professionals Aachen',
          'digital nomad housing Germany',
          'list my apartment Cologne',
          'safe landlord platform Germany',
          'tenant screening Germany',
        ],
      }) }} />

      {/* ======= Footer ======= */}
      <footer>
        <div className="footer-certification">
          <div className="certification-badges">
            <div className="certification-badge german-authority">
              <span data-translate="footer.certified">German Authority Certified</span>
            </div>
            <div className="certification-badge security-verified">
              <span>Security Verified</span>
            </div>
            <div className="certification-badge data-protection">
              <span>GDPR Compliant</span>
            </div>
          </div>
          <div className="certification-text">
            <span data-translate="footer.certified">SichrPlace is certified by German authorities as a trusted rental platform.</span>
            {' '}Our security measures and data protection protocols meet the highest European standards.
          </div>
        </div>

        <div className="footer-links">
          <a href="/about" data-translate="footer.about">About</a>
          <a href="/faq">FAQ</a>
          <a href="customer-service.html">Customer Service</a>
          <a href="marketplace.html">Marketplace</a>
          <a href="/privacy-policy" data-translate="footer.privacy">Privacy Policy</a>
          <a href="/terms" data-translate="footer.terms">Terms of Service</a>
        </div>
        <div className="footer-social">
          <a href="https://www.linkedin.com/company/sichrplace/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin" /></a>
          <a href="https://www.facebook.com/sichrplace" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook" /></a>
          <a href="https://www.instagram.com/sichrplace" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram" /></a>
          <a href="https://www.tiktok.com/@sichrplace" target="_blank" rel="noopener noreferrer"><i className="fab fa-tiktok" /></a>
        </div>

        <div className="footer-brand" style={{ textAlign: 'center', margin: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LogoLink size={48} />
          <div className="footer-brand-text" style={{ color: '#fff', fontSize: 14 }}>
            Your Trusted Rental Platform
          </div>
        </div>

        <p style={{ marginTop: 16 }}>
          &copy; 2025 SichrPlace. All rights reserved.<br />
          Created by{' '}
          <a href="https://www.linkedin.com/in/z%C3%A9t%C3%A9ny-dobos/?originalSubdomain=hu" style={{ color: '#40E0D0' }}>Z{'é'}t{'é'}ny Dobos</a>
          {' '}and{' '}
          <a href="https://www.linkedin.com/in/%C3%B6mer-%C3%BC%C3%A7kale-482787202/" style={{ color: '#40E0D0' }}>{'Ö'}mer {'Ü'}{'ç'}kale</a>.
        </p>
      </footer>
    </>
  )
}
