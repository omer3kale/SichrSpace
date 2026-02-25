'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { PaymentOptions } from '@/components/PaymentOptions'
import { apiUrl } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Type matching ApartmentDto                                         */
/* ------------------------------------------------------------------ */

type ApartmentDetail = {
  id: number
  ownerId: number
  ownerName: string
  ownerAvatarUrl: string | null
  ownerIsCompany: boolean
  title: string
  description: string | null
  areaDescription: string | null
  city: string
  district: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  monthlyRent: number
  priceWarm: number | null
  depositAmount: number | null
  sizeSquareMeters: number | null
  propertyType: string | null
  numberOfBedrooms: number | null
  numberOfBathrooms: number | null
  numberOfSingleBeds: number | null
  numberOfDoubleBeds: number | null
  furnishedStatus: string | null
  furnished: boolean | null
  availableFrom: string | null
  moveOutDate: string | null
  earliestMoveIn: string | null
  flexibleTimeslot: boolean | null
  petFriendly: boolean | null
  hasParking: boolean | null
  hasElevator: boolean | null
  hasBalcony: boolean | null
  hasWifi: boolean | null
  hasWashingMachine: boolean | null
  hasDishwasher: boolean | null
  hasAirConditioning: boolean | null
  hasHeating: boolean | null
  excludeExchangeOffer: boolean | null
  amenities: string | null
  images: string[]
  floorPlanUrl: string | null
  status: string
  numberOfViews: number | null
  averageRating: number | null
  reviewCount: number | null
  createdAt: string
  updatedAt: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function authHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function propertyLabel(t: string | null) {
  if (!t) return null
  const map: Record<string, string> = {
    SHARED_ROOM: 'Shared Room', PRIVATE_ROOM: 'Private Room',
    STUDIO: 'Studio', LOFT: 'Loft', APARTMENT: 'Apartment', HOUSE: 'House',
  }
  return map[t] ?? t
}

function furnishedLabel(f: string | null) {
  if (!f) return null
  const map: Record<string, string> = {
    FURNISHED: 'Furnished', SEMI_FURNISHED: 'Semi-furnished', UNFURNISHED: 'Unfurnished',
  }
  return map[f] ?? f
}

function imgSrc(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}${url}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OfferDetailPage() {
  const params = useParams()
  const apartmentId = params?.id as string

  const [apt, setApt] = useState<ApartmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imgIdx, setImgIdx] = useState(0)

  /* modals */
  const [showBooking, setShowBooking] = useState(false)
  const [showHowToBook, setShowHowToBook] = useState(false)
  const [bookingStatus, setBookingStatus] = useState('')
  const [wishlistAdded, setWishlistAdded] = useState(false)

  /* ---- fetch apartment ---- */
  useEffect(() => {
    if (!apartmentId) return
    const load = async () => {
      try {
        const res = await fetch(apiUrl(`/apartments/${apartmentId}`))
        if (!res.ok) throw new Error(res.status === 404 ? 'Apartment not found.' : `Error ${res.status}`)
        setApt(await res.json())
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load apartment.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apartmentId])

  /* ---- wishlist ---- */
  const toggleWishlist = async () => {
    if (!apt) return
    try {
      const res = await fetch(apiUrl(`/favorites/${apt.id}`), {
        method: wishlistAdded ? 'DELETE' : 'POST',
        headers: authHeaders(),
      })
      if (res.ok || res.status === 204) setWishlistAdded(!wishlistAdded)
    } catch {
      /* silent */
    }
  }

  /* ---- booking submit ---- */
  const handleBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!apt) return
    setBookingStatus('')
    const form = e.currentTarget
    const fd = new FormData(form)

    /* Build adultsJson — a JSON array of { name, relationToApplicant } */
    const tenantName = (fd.get('tenantNames') as string) || ''
    const adultsJson = JSON.stringify(
      tenantName.split(',').map((n) => ({
        name: n.trim(),
        relationToApplicant: 'APPLICANT',
      }))
    )

    try {
      const res = await fetch(apiUrl(`/api/apartments/${apt.id}/booking-requests`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          preferredMoveIn: fd.get('moveIn'),
          preferredMoveOut: fd.get('moveOut') || null,
          adultsJson,
          reasonType: fd.get('reasonType'),
          detailedReason: fd.get('detailedReason') || '',
          payer: fd.get('payer'),
          wouldExtendLater: false,
          childrenJson: '[]',
          petsJson: '[]',
        }),
      })
      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(errBody || 'Failed')
      }
      setBookingStatus('Booking request sent! The landlord will review it.')
      form.reset()
      setTimeout(() => setShowBooking(false), 2500)
    } catch {
      setBookingStatus('Failed to send booking request.')
    }
  }

  /* ---- amenity list ---- */
  function amenityBadges() {
    if (!apt) return []
    const list: { icon: string; label: string }[] = []
    if (apt.hasWifi) list.push({ icon: 'fa-wifi', label: 'WiFi' })
    if (apt.hasParking) list.push({ icon: 'fa-car', label: 'Parking' })
    if (apt.hasElevator) list.push({ icon: 'fa-elevator', label: 'Elevator' })
    if (apt.hasBalcony) list.push({ icon: 'fa-sun', label: 'Balcony' })
    if (apt.hasWashingMachine) list.push({ icon: 'fa-shirt', label: 'Washing machine' })
    if (apt.hasDishwasher) list.push({ icon: 'fa-glass-water', label: 'Dishwasher' })
    if (apt.hasAirConditioning) list.push({ icon: 'fa-snowflake', label: 'Air conditioning' })
    if (apt.hasHeating) list.push({ icon: 'fa-fire', label: 'Heating' })
    if (apt.petFriendly) list.push({ icon: 'fa-paw', label: 'Pet friendly' })
    return list
  }

  /* ---- images ---- */
  const images = apt?.images ?? []
  const prevImg = () => setImgIdx((i) => (i > 0 ? i - 1 : images.length - 1))
  const nextImg = () => setImgIdx((i) => (i < images.length - 1 ? i + 1 : 0))

  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="offer-layout">
        <SiteHeader />
        <main className="offer-main">
          <div className="offer-loading"><div className="offer-spinner" /><p>Loading apartment…</p></div>
        </main>
      </div>
    )
  }
  if (error || !apt) {
    return (
      <div className="offer-layout">
        <SiteHeader />
        <main className="offer-main">
          <div className="offer-banner offer-banner-error">
            <i className="fa-solid fa-circle-exclamation" /> {error || 'Apartment not found.'}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="offer-layout">
      {/* ======= Top bar ======= */}
      <SiteHeader />

      {/* ======= Action bar ======= */}
      <div className="offer-topbar-actions" style={{ padding: '10px 32px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/offer" className="offer-back-link">
            <i className="fa-solid fa-arrow-left" /> Back to Listings
          </Link>
          <button className="offer-btn-accent" onClick={() => setShowBooking(true)}>
            <i className="fa-solid fa-bed" /> Request Booking
          </button>
          <button className="offer-btn-outline" onClick={() => setShowHowToBook(true)}>
            <i className="fa-solid fa-question-circle" /> How to Book?
          </button>
        </div>

      <main className="offer-detail-main">
        <div className="offer-detail-grid">
          {/* ============ LEFT COLUMN ============ */}
          <div className="offer-detail-left">
            {/* Image gallery */}
            {images.length > 0 ? (
              <div className="offer-gallery">
                <button className="offer-gallery-btn offer-gallery-prev" onClick={prevImg}>
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <div className="offer-gallery-img-wrap">
                  <Image
                    src={imgSrc(images[imgIdx])}
                    alt={`${apt.title} – image ${imgIdx + 1}`}
                    fill style={{ objectFit: 'contain' }}
                    unoptimized
                  />
                </div>
                <button className="offer-gallery-btn offer-gallery-next" onClick={nextImg}>
                  <i className="fa-solid fa-chevron-right" />
                </button>
                <span className="offer-gallery-counter">{imgIdx + 1} / {images.length}</span>
              </div>
            ) : (
              <div className="offer-gallery-empty">
                <i className="fa-solid fa-image" /> No photos available
              </div>
            )}

            {/* Share + wishlist */}
            <div className="offer-action-row">
              <button className="offer-btn-share" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                <i className="fa-solid fa-share-alt" /> Share
              </button>
              <button className={`offer-btn-wish ${wishlistAdded ? 'offer-btn-wish-active' : ''}`} onClick={toggleWishlist}>
                <i className={wishlistAdded ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} />
                {wishlistAdded ? ' Saved' : ' Add to Wishlist'}
              </button>
            </div>

            {/* Title & address */}
            <h1 className="offer-detail-title">{apt.title}</h1>
            {apt.address && <h3 className="offer-detail-address"><i className="fa-solid fa-location-dot" /> {apt.address}, {apt.city}</h3>}
            {!apt.address && <h3 className="offer-detail-address"><i className="fa-solid fa-location-dot" /> {apt.city}{apt.district ? `, ${apt.district}` : ''}</h3>}

            {/* Price row */}
            <div className="offer-detail-prices">
              <div className="offer-price-main">{fmtCurrency(apt.monthlyRent)} <span className="offer-price-label">/ month</span></div>
              {apt.priceWarm != null && <div className="offer-price-warm">Warm rent: {fmtCurrency(apt.priceWarm)}</div>}
              {apt.depositAmount != null && <div className="offer-price-deposit">Deposit: {fmtCurrency(apt.depositAmount)}</div>}
            </div>

            {/* Details row */}
            <div className="offer-detail-facts">
              {propertyLabel(apt.propertyType) && <span className="offer-fact"><i className="fa-solid fa-building" /> {propertyLabel(apt.propertyType)}</span>}
              {apt.sizeSquareMeters != null && <span className="offer-fact"><i className="fa-solid fa-ruler-combined" /> {apt.sizeSquareMeters} m²</span>}
              {apt.numberOfBedrooms != null && <span className="offer-fact"><i className="fa-solid fa-door-open" /> {apt.numberOfBedrooms} bedrooms</span>}
              {apt.numberOfBathrooms != null && <span className="offer-fact"><i className="fa-solid fa-bath" /> {apt.numberOfBathrooms} bathrooms</span>}
              {furnishedLabel(apt.furnishedStatus) && <span className="offer-fact"><i className="fa-solid fa-couch" /> {furnishedLabel(apt.furnishedStatus)}</span>}
            </div>

            {/* Amenities */}
            {amenityBadges().length > 0 && (
              <section className="offer-section">
                <h3 className="offer-section-title">Amenities</h3>
                <div className="offer-amenity-grid">
                  {amenityBadges().map((a) => (
                    <span key={a.label} className="offer-amenity-badge">
                      <i className={`fa-solid ${a.icon}`} /> {a.label}
                    </span>
                  ))}
                </div>
                {apt.amenities && <p className="offer-amenity-extra">{apt.amenities}</p>}
              </section>
            )}

            {/* Description */}
            {apt.description && (
              <section className="offer-section">
                <h3 className="offer-section-title">Description</h3>
                <p className="offer-section-text">{apt.description}</p>
              </section>
            )}

            {/* Area description */}
            {apt.areaDescription && (
              <section className="offer-section">
                <h3 className="offer-section-title">Area Description</h3>
                <p className="offer-section-text">{apt.areaDescription}</p>
              </section>
            )}

            {/* Availability */}
            <section className="offer-section">
              <h3 className="offer-section-title">Availability</h3>
              <div className="offer-availability-row">
                {apt.availableFrom && <span><strong>Move-in:</strong> {fmtDate(apt.availableFrom)}</span>}
                {apt.moveOutDate && <span><strong>Move-out:</strong> {fmtDate(apt.moveOutDate)}</span>}
                {apt.earliestMoveIn && <span><strong>Earliest:</strong> {fmtDate(apt.earliestMoveIn)}</span>}
                {apt.flexibleTimeslot && <span className="offer-flex-badge">Flexible dates</span>}
              </div>
            </section>
          </div>

          {/* ============ RIGHT COLUMN ============ */}
          <aside className="offer-detail-right">
            {/* Landlord card */}
            <div className="offer-landlord-card">
              <h3 className="offer-landlord-heading">Landlord</h3>
              <div className="offer-landlord-row">
                {apt.ownerAvatarUrl ? (
                  <Image src={imgSrc(apt.ownerAvatarUrl)} alt={apt.ownerName} width={48} height={48}
                    className="offer-landlord-avatar" unoptimized />
                ) : (
                  <div className="offer-landlord-avatar-placeholder">
                    <i className="fa-solid fa-user" />
                  </div>
                )}
                <div>
                  <p className="offer-landlord-name">{apt.ownerName}</p>
                  {apt.ownerIsCompany && <span className="offer-landlord-company">Company</span>}
                </div>
              </div>

              <button className="offer-sidebar-btn offer-btn-primary" onClick={() => setShowBooking(true)}>
                <i className="fa-solid fa-bed" /> Request Booking
              </button>
              <button className="offer-sidebar-btn offer-btn-accent" onClick={() => setShowHowToBook(true)}>
                <i className="fa-solid fa-question-circle" /> How to Book?
              </button>
              <a href="mailto:sichrplace@gmail.com" className="offer-sidebar-btn offer-btn-soft">
                Customer Service
              </a>
            </div>

            {/* Viewing payment */}
            <div className="offer-viewing-card">
              <h3 className="offer-landlord-heading">Request a Viewing</h3>
              <p className="offer-viewing-hint">Book a professional viewing with fee.</p>
              <PaymentOptions
                amount={25.0}
                currency="EUR"
                description={`Viewing of "${apt.title}" (#${apt.id})`}
                context="viewing_payment"
                resourceId={apt.id}
              />
            </div>

            {/* Stats */}
            {(apt.numberOfViews != null || apt.averageRating != null) && (
              <div className="offer-stats-card">
                {apt.numberOfViews != null && (
                  <div className="offer-stat"><i className="fa-solid fa-eye" /> {apt.numberOfViews.toLocaleString()} views</div>
                )}
                {apt.averageRating != null && (
                  <div className="offer-stat"><i className="fa-solid fa-star" /> {apt.averageRating.toFixed(1)} ({apt.reviewCount ?? 0} reviews)</div>
                )}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ======= Booking modal ======= */}
      {showBooking && (
        <div className="offer-modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="offer-modal-header">
              Booking Request
              <button className="offer-modal-close" onClick={() => setShowBooking(false)}>&times;</button>
            </div>
            <form className="offer-modal-body" onSubmit={handleBookingSubmit}>
              <label className="offer-modal-label">Preferred Move-in Date *</label>
              <input className="offer-modal-input" type="date" name="moveIn" required />
              <label className="offer-modal-label">Preferred Move-out Date</label>
              <input className="offer-modal-input" type="date" name="moveOut" />
              <label className="offer-modal-label">Tenant Name(s) *</label>
              <input className="offer-modal-input" type="text" name="tenantNames" placeholder="e.g. John Doe, Jane Doe" required />
              <label className="offer-modal-label">Reason for Moving *</label>
              <select className="offer-modal-input" name="reasonType" required>
                <option value="">Select reason…</option>
                <option value="WORK">Work</option>
                <option value="STUDY">Study</option>
                <option value="TEMPORARY_STAY">Temporary Stay</option>
                <option value="APPRENTICESHIP">Apprenticeship</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
              <label className="offer-modal-label">Additional Details</label>
              <textarea className="offer-modal-textarea" name="detailedReason" placeholder="Tell the landlord about yourself, your lifestyle, etc." />
              <label className="offer-modal-label">Who Will Pay the Rent? *</label>
              <select className="offer-modal-input" name="payer" required>
                <option value="">Select…</option>
                <option value="MYSELF">Myself</option>
                <option value="FAMILY">Family</option>
                <option value="SCHOLARSHIP">Scholarship</option>
                <option value="COMPANY">Company</option>
              </select>
              <button type="submit" className="offer-modal-submit">Send Booking Request</button>
              {bookingStatus && <p className="offer-modal-status">{bookingStatus}</p>}
            </form>
          </div>
        </div>
      )}

      {/* ======= How to Book modal ======= */}
      {showHowToBook && (
        <div className="offer-modal-overlay" onClick={() => setShowHowToBook(false)}>
          <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="offer-modal-header">
              How to Book
              <button className="offer-modal-close" onClick={() => setShowHowToBook(false)}>&times;</button>
            </div>
            <div className="offer-modal-body">
              <ol className="offer-how-list">
                <li>Register and sign-in</li>
                <li>Create your account</li>
                <li>Fill in your personal details</li>
                <li>Post an apartment offer or browse listings</li>
                <li>Discuss details in chat</li>
                <li>Request to book apartment</li>
                <li>After acceptance, apply for viewing (admins will contact you)</li>
                <li>Receive confirmation</li>
                <li>Secure payment</li>
                <li>Get viewing video footage</li>
                <li>Ask for contract creation with landlord</li>
                <li>Sign contract online and move in</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <footer className="offer-footer">
        <p>&copy; {new Date().getFullYear()} SichrPlace. All rights reserved.</p>
        <p>
          <Link href="/privacy-policy" className="offer-footer-link">Privacy Policy</Link>
          {' | '}
          <Link href="/terms" className="offer-footer-link">Terms of Service</Link>
        </p>
      </footer>
    </div>
  )
}
