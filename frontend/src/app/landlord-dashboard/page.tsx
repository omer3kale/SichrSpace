'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { apiUrl } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

/* ── types ── */

type ProfileData = {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  profileImageUrl?: string
  completionPercentage: number
  companyName?: string
}

type ViewingStats = {
  totalRequests: number
  pendingCount: number
  confirmedCount: number
  declinedCount: number
  completedCount: number
  cancelledCount: number
  averageResponseTimeHours: number | null
}

type ApartmentDto = {
  id: number
  title: string
  city: string
  district: string
  monthlyRent: number
  status: string
  propertyType: string
  numberOfBedrooms: number
  numberOfBathrooms: number
  sizeSquareMeters: number
  availableFrom: string | null
  numberOfViews: number
  averageRating: number
  reviewCount: number
  createdAt: string
  images: string[]
}

type ViewingRequest = {
  id: number
  apartmentId: number
  apartmentTitle: string
  tenantId: number
  tenantName: string
  proposedDateTime: string | null
  message: string | null
  status: string
  confirmedDateTime: string | null
  declineReason: string | null
  createdAt: string
}

type BookingRequest = {
  id: number
  apartmentId: number
  apartmentTitle: string
  tenantId: number
  tenantName: string
  preferredMoveIn: string | null
  preferredMoveOut: string | null
  reasonType: string
  status: string
  createdAt: string
}

type SupportTicket = {
  id: number
  subject: string
  status: string
  category: string
  createdAt: string
}

/* ── helpers ── */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusClass(status: string): string {
  const s = status.toUpperCase()
  if (s === 'CONFIRMED' || s === 'ACCEPTED' || s === 'ACTIVE') return 'ldash-status-confirmed'
  if (s === 'COMPLETED') return 'ldash-status-completed'
  if (s === 'CANCELLED' || s === 'DECLINED' || s === 'INACTIVE') return 'ldash-status-cancelled'
  if (s === 'PENDING' || s === 'SUBMITTED' || s === 'DRAFT') return 'ldash-status-pending'
  return 'ldash-status-default'
}

/* ── component ── */

export default function LandlordDashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [viewingStats, setViewingStats] = useState<ViewingStats | null>(null)
  const [listings, setListings] = useState<ApartmentDto[]>([])
  const [viewings, setViewings] = useState<ViewingRequest[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const [profileError, setProfileError] = useState('')
  const [listingsError, setListingsError] = useState('')
  const [viewingsError, setViewingsError] = useState('')
  const [bookingsError, setBookingsError] = useState('')
  const [ticketsError, setTicketsError] = useState('')

  const [loading, setLoading] = useState(true)
  const [bookingActionId, setBookingActionId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const headers = getAuthHeaders()

    const results = await Promise.allSettled([
      /* 0 */ fetch(apiUrl('/api/profiles/me'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 1 */ fetch(apiUrl('/api/viewing-requests/statistics'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 2 */ fetch(apiUrl('/api/apartments/owner/listings'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 3 */ fetch(apiUrl('/api/viewing-requests/received'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 4 */ fetch(apiUrl('/api/landlord/booking-requests'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 5 */ fetch(apiUrl('/api/support/tickets'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 6 */ fetch(apiUrl('/api/notifications/unread/count'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
    ])

    // Profile
    if (results[0].status === 'fulfilled') {
      setProfile(results[0].value)
      setProfileError('')
    } else {
      setProfileError('Failed to load profile.')
    }

    // Viewing stats (auto role-aware)
    if (results[1].status === 'fulfilled') setViewingStats(results[1].value)

    // Own listings
    if (results[2].status === 'fulfilled') {
      setListings(results[2].value)
      setListingsError('')
    } else {
      setListingsError('Could not load listings.')
    }

    // Received viewing requests
    if (results[3].status === 'fulfilled') {
      setViewings(results[3].value)
      setViewingsError('')
    } else {
      setViewingsError('Could not load viewing requests.')
    }

    // Booking requests
    if (results[4].status === 'fulfilled') {
      setBookings(results[4].value)
      setBookingsError('')
    } else {
      setBookingsError('Could not load booking requests.')
    }

    // Support tickets
    if (results[5].status === 'fulfilled') {
      setTickets(results[5].value)
      setTicketsError('')
    } else {
      setTicketsError('Could not load support tickets.')
    }

    // Unread notifications
    if (results[6].status === 'fulfilled') setUnreadCount(results[6].value.count ?? 0)

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ── booking actions ── */
  const handleBookingAction = async (bookingId: number, action: 'accept' | 'decline') => {
    setBookingActionId(bookingId)
    try {
      const res = await fetch(apiUrl(`/api/landlord/booking-requests/${bookingId}/${action}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Failed to ${action}`)
      // Refresh bookings list
      await load()
    } catch {
      setBookingsError(`Could not ${action} booking #${bookingId}.`)
    } finally {
      setBookingActionId(null)
    }
  }

  const activeListings = listings.filter((l) => l.status === 'ACTIVE')
  const openTickets = tickets.filter((t) => t.status !== 'RESOLVED')
  const pendingBookings = bookings.filter((b) => b.status === 'SUBMITTED')

  return (
    <ProtectedRoute allowedRoles={['LANDLORD']}>
      {/* ── TOPBAR ── */}
      <SiteHeader />

      <main className="ldash-main">
        {profileError && (
          <div className="ldash-banner ldash-banner-error">
            <i className="fas fa-exclamation-triangle" /> {profileError}
            <button className="ldash-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="ldash-loading">
            <span className="ldash-spinner" />
            <span>Loading dashboard…</span>
          </div>
        ) : (
          <>
            {/* ── KPI OVERVIEW ── */}
            <section className="ldash-section">
              <h2 className="ldash-section-title">Overview</h2>
              <div className="ldash-kpi-grid">
                <Link href="/my-listings" className="ldash-kpi-card ldash-kpi-blue">
                  <i className="fas fa-building" />
                  <div className="ldash-kpi-value">{activeListings.length}</div>
                  <div className="ldash-kpi-label">Active Listings</div>
                </Link>
                <Link href="/my-listings" className="ldash-kpi-card ldash-kpi-purple">
                  <i className="fas fa-layer-group" />
                  <div className="ldash-kpi-value">{listings.length}</div>
                  <div className="ldash-kpi-label">Total Listings</div>
                </Link>
                <Link href="/landlord/viewings?status=pending" className="ldash-kpi-card ldash-kpi-yellow">
                  <i className="fas fa-clock" />
                  <div className="ldash-kpi-value">{viewingStats?.pendingCount ?? 0}</div>
                  <div className="ldash-kpi-label">Pending Viewings</div>
                </Link>
                <Link href="/landlord/viewings" className="ldash-kpi-card ldash-kpi-teal">
                  <i className="fas fa-video" />
                  <div className="ldash-kpi-value">{viewingStats?.totalRequests ?? 0}</div>
                  <div className="ldash-kpi-label">Total Viewings</div>
                </Link>
                <Link href="/landlord/bookings" className="ldash-kpi-card ldash-kpi-green">
                  <i className="fas fa-file-signature" />
                  <div className="ldash-kpi-value">{pendingBookings.length}</div>
                  <div className="ldash-kpi-label">Pending Bookings</div>
                </Link>
                <Link href="/notifications" className="ldash-kpi-card ldash-kpi-gray">
                  <i className="fas fa-bell" />
                  <div className="ldash-kpi-value">{unreadCount}</div>
                  <div className="ldash-kpi-label">Notifications</div>
                </Link>
              </div>
            </section>

            {/* ── MY LISTINGS ── */}
            <section className="ldash-section">
              <div className="ldash-section-header">
                <h2 className="ldash-section-title">
                  <i className="fas fa-building" /> My Listings
                </h2>
                <Link href="/create-listing" className="ldash-btn-primary">
                  <i className="fas fa-plus" /> New Listing
                </Link>
              </div>
              {listingsError ? (
                <p className="ldash-error">{listingsError}</p>
              ) : listings.length === 0 ? (
                <p className="ldash-empty">
                  You have no listings yet. Create your first apartment listing!
                </p>
              ) : (
                <div className="ldash-table-wrap">
                  <table className="ldash-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>City</th>
                        <th>Rent</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Views</th>
                        <th>Rating</th>
                        <th>Status</th>
                        <th>Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.slice(0, 10).map((apt) => (
                        <tr key={apt.id}>
                          <td>
                            <Link href={`/apartments/${apt.id}`} className="ldash-table-link">
                              {apt.title}
                            </Link>
                          </td>
                          <td>{apt.city}{apt.district ? `, ${apt.district}` : ''}</td>
                          <td className="ldash-table-num">€{apt.monthlyRent?.toLocaleString() ?? '--'}</td>
                          <td>{apt.propertyType?.replace(/_/g, ' ')}</td>
                          <td className="ldash-table-num">
                            {apt.sizeSquareMeters ? `${apt.sizeSquareMeters} m²` : '--'}
                          </td>
                          <td className="ldash-table-num">{apt.numberOfViews ?? 0}</td>
                          <td className="ldash-table-num">
                            {apt.averageRating ? `${apt.averageRating.toFixed(1)} ★` : '--'}
                          </td>
                          <td>
                            <span className={`ldash-status-badge ${statusClass(apt.status)}`}>
                              {apt.status}
                            </span>
                          </td>
                          <td>{fmtDateShort(apt.availableFrom)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {listings.length > 10 && (
                    <Link href="/my-listings" className="ldash-section-link">
                      View all {listings.length} listings <i className="fas fa-arrow-right" />
                    </Link>
                  )}
                </div>
              )}
            </section>

            {/* ── PANELS GRID: Viewings · Bookings · Support ── */}
            <div className="ldash-panels">
              {/* Viewing Requests */}
              <section className="ldash-section ldash-panel">
                <h2 className="ldash-section-title">
                  <i className="fas fa-video" /> Viewing Requests
                </h2>
                {viewingsError ? (
                  <p className="ldash-error">{viewingsError}</p>
                ) : viewings.length === 0 ? (
                  <p className="ldash-empty">No viewing requests received yet.</p>
                ) : (
                  <ul className="ldash-list">
                    {viewings.slice(0, 8).map((v) => (
                      <li key={v.id} className="ldash-list-item">
                        <div className="ldash-list-primary">
                          <span className="ldash-list-title">{v.apartmentTitle}</span>
                          <span className="ldash-list-sub">
                            <i className="fas fa-user" /> {v.tenantName}
                          </span>
                          <span className="ldash-list-date">
                            {fmtDate(v.confirmedDateTime || v.proposedDateTime)}
                          </span>
                        </div>
                        <span className={`ldash-status-badge ${statusClass(v.status)}`}>
                          {v.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {viewings.length > 0 && (
                  <Link href="/landlord/viewings" className="ldash-section-link">
                    View all viewings <i className="fas fa-arrow-right" />
                  </Link>
                )}
              </section>

              {/* Booking Requests */}
              <section className="ldash-section ldash-panel">
                <h2 className="ldash-section-title">
                  <i className="fas fa-file-signature" /> Booking Requests
                </h2>
                {bookingsError ? (
                  <p className="ldash-error">{bookingsError}</p>
                ) : bookings.length === 0 ? (
                  <p className="ldash-empty">No booking requests received yet.</p>
                ) : (
                  <ul className="ldash-list">
                    {bookings.slice(0, 8).map((b) => (
                      <li key={b.id} className="ldash-list-item">
                        <div className="ldash-list-primary">
                          <span className="ldash-list-title">{b.apartmentTitle}</span>
                          <span className="ldash-list-sub">
                            <i className="fas fa-user" /> {b.tenantName} · {b.reasonType?.replace(/_/g, ' ')}
                          </span>
                          <span className="ldash-list-date">
                            Move-in: {fmtDateShort(b.preferredMoveIn)}
                          </span>
                        </div>
                        <div className="ldash-booking-actions">
                          <span className={`ldash-status-badge ${statusClass(b.status)}`}>
                            {b.status}
                          </span>
                          {b.status === 'SUBMITTED' && (
                            <div className="ldash-action-btns">
                              <button
                                className="ldash-btn-accept"
                                disabled={bookingActionId === b.id}
                                onClick={() => handleBookingAction(b.id, 'accept')}
                              >
                                {bookingActionId === b.id ? '…' : <><i className="fas fa-check" /> Accept</>}
                              </button>
                              <button
                                className="ldash-btn-decline"
                                disabled={bookingActionId === b.id}
                                onClick={() => handleBookingAction(b.id, 'decline')}
                              >
                                {bookingActionId === b.id ? '…' : <><i className="fas fa-times" /> Decline</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {bookings.length > 0 && (
                  <Link href="/landlord/bookings" className="ldash-section-link">
                    View all bookings <i className="fas fa-arrow-right" />
                  </Link>
                )}
              </section>

              {/* Support */}
              <section className="ldash-section ldash-panel">
                <h2 className="ldash-section-title">
                  <i className="fas fa-headset" /> Support
                </h2>
                {ticketsError ? (
                  <p className="ldash-error">{ticketsError}</p>
                ) : (
                  <>
                    <div className="ldash-support-summary">
                      <div className="ldash-support-stat">
                        <span className="ldash-support-num">{openTickets.length}</span>
                        <span className="ldash-support-label">Open tickets</span>
                      </div>
                      <div className="ldash-support-stat">
                        <span className="ldash-support-num">{tickets.length}</span>
                        <span className="ldash-support-label">Total tickets</span>
                      </div>
                    </div>
                    {tickets.length > 0 && (
                      <ul className="ldash-list ldash-list-compact">
                        {tickets.slice(0, 5).map((t) => (
                          <li key={t.id} className="ldash-list-item">
                            <span className="ldash-list-primary">{t.subject}</span>
                            <span className={`ldash-status-badge ${statusClass(t.status)}`}>
                              {t.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link href="/support" className="ldash-section-link">
                      Open support area <i className="fas fa-arrow-right" />
                    </Link>
                  </>
                )}
              </section>
            </div>

            {/* ── STATS SUMMARY ── */}
            {viewingStats && (
              <section className="ldash-section ldash-stats-section">
                <h2 className="ldash-section-title">
                  <i className="fas fa-chart-bar" /> Performance
                </h2>
                <div className="ldash-stats-grid">
                  <div className="ldash-stat-card">
                    <div className="ldash-stat-value">{viewingStats.confirmedCount}</div>
                    <div className="ldash-stat-label">Confirmed</div>
                  </div>
                  <div className="ldash-stat-card">
                    <div className="ldash-stat-value">{viewingStats.completedCount}</div>
                    <div className="ldash-stat-label">Completed</div>
                  </div>
                  <div className="ldash-stat-card">
                    <div className="ldash-stat-value">{viewingStats.declinedCount}</div>
                    <div className="ldash-stat-label">Declined</div>
                  </div>
                  <div className="ldash-stat-card">
                    <div className="ldash-stat-value">
                      {viewingStats.averageResponseTimeHours
                        ? `${viewingStats.averageResponseTimeHours}h`
                        : '--'}
                    </div>
                    <div className="ldash-stat-label">Avg Response</div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="ldash-footer">
        <LogoLink size={36} />
        <div className="ldash-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </ProtectedRoute>
  )
}
