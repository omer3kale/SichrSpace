'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { apiUrl } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

type ProfileData = {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  profileImageUrl?: string
  completionPercentage: number
  hobbies?: string
  dailyRoutine?: string
  lifestyleTags?: string
  smokingStatus?: string
  petOwner?: boolean
  gender?: string
  city?: string
  country?: string
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

type FavoriteItem = {
  id: number
  apartmentId: number
  apartmentTitle: string
  apartmentCity: string
  apartmentMonthlyRent: number
  apartmentStatus: string
  createdAt: string
}

type ViewingRequest = {
  id: number
  apartmentId: number
  apartmentTitle: string
  status: string
  proposedDateTime: string | null
  confirmedDateTime: string | null
  createdAt: string
}

type SupportTicket = {
  id: number
  subject: string
  status: string
  category: string
  createdAt: string
}

type BookingRequest = {
  id: number
  apartmentId: number
  apartmentTitle: string
  status: string
  preferredMoveIn: string | null
  preferredMoveOut: string | null
  reasonType: string | null
  createdAt: string
}

type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

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

function statusClass(status: string): string {
  const s = status.toUpperCase()
  if (s === 'CONFIRMED' || s === 'ACCEPTED') return 'adash-status-confirmed'
  if (s === 'COMPLETED') return 'adash-status-completed'
  if (s === 'CANCELLED' || s === 'DECLINED') return 'adash-status-cancelled'
  if (s === 'PENDING' || s === 'SUBMITTED' || s === 'DRAFT') return 'adash-status-pending'
  return 'adash-status-default'
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [viewingStats, setViewingStats] = useState<ViewingStats | null>(null)
  const [favCount, setFavCount] = useState<number>(0)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [viewings, setViewings] = useState<ViewingRequest[]>([])
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  const [profileError, setProfileError] = useState('')
  const [viewingsError, setViewingsError] = useState('')
  const [favoritesError, setFavoritesError] = useState('')
  const [bookingsError, setBookingsError] = useState('')
  const [ticketsError, setTicketsError] = useState('')

  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const headers = getAuthHeaders()

    const results = await Promise.allSettled([
      fetch(apiUrl('/api/profiles/me'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      fetch(apiUrl('/api/viewing-requests/statistics'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      fetch(apiUrl('/api/favorites/count'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      fetch(apiUrl('/api/notifications/unread/count'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      fetch(apiUrl('/api/favorites?size=6'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json() as Promise<PageResponse<FavoriteItem>>
      }),
      fetch(apiUrl('/api/viewing-requests/my'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      fetch(apiUrl('/api/support/tickets'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
      /* 7 — tenant booking requests */
      fetch(apiUrl('/api/tenant/booking-requests'), { headers }).then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      }),
    ])

    if (results[0].status === 'fulfilled') {
      setProfile(results[0].value)
      setProfileError('')
    } else {
      setProfileError('Failed to load profile.')
    }

    if (results[1].status === 'fulfilled') {
      setViewingStats(results[1].value)
    }

    if (results[2].status === 'fulfilled') {
      setFavCount(results[2].value.count ?? 0)
    }

    if (results[3].status === 'fulfilled') {
      setUnreadCount(results[3].value.count ?? 0)
    }

    if (results[4].status === 'fulfilled') {
      setFavorites(results[4].value.content ?? [])
      setFavoritesError('')
    } else {
      setFavoritesError('Could not load favorites.')
    }

    if (results[5].status === 'fulfilled') {
      setViewings(results[5].value)
      setViewingsError('')
    } else {
      setViewingsError('Could not load viewing requests.')
    }

    if (results[6].status === 'fulfilled') {
      setTickets(results[6].value)
      setTicketsError('')
    } else {
      setTicketsError('Could not load support tickets.')
    }

    if (results[7].status === 'fulfilled') {
      setBookings(results[7].value)
      setBookingsError('')
    } else {
      setBookingsError('Could not load booking requests.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openTickets = tickets.filter((t) => t.status !== 'RESOLVED')

  return (
    <ProtectedRoute allowedRoles={['TENANT']}>
      <SiteHeader />

      <main className="adash-main">
        {profileError && (
          <div className="adash-banner adash-banner-error">
            <i className="fas fa-exclamation-triangle" /> {profileError}
            <button className="adash-retry-btn" onClick={load}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="adash-loading">
            <span className="adash-spinner" />
            <span>Loading dashboard...</span>
          </div>
        ) : (
          <>
            <section className="adash-section">
              <h2 className="adash-section-title">Overview</h2>
              <div className="adash-kpi-grid">
                <Link href="/favorites" className="adash-kpi-card adash-kpi-blue">
                  <i className="fas fa-heart" />
                  <div className="adash-kpi-value">{favCount}</div>
                  <div className="adash-kpi-label">Favorites</div>
                </Link>
                <Link href="/viewings" className="adash-kpi-card adash-kpi-purple">
                  <i className="fas fa-video" />
                  <div className="adash-kpi-value">
                    {viewingStats?.totalRequests ?? 0}
                  </div>
                  <div className="adash-kpi-label">Viewing Requests</div>
                </Link>
                <Link href="/viewings?status=pending" className="adash-kpi-card adash-kpi-yellow">
                  <i className="fas fa-clock" />
                  <div className="adash-kpi-value">
                    {viewingStats?.pendingCount ?? 0}
                  </div>
                  <div className="adash-kpi-label">Pending Viewings</div>
                </Link>
                <Link href="/viewings?status=completed" className="adash-kpi-card adash-kpi-green">
                  <i className="fas fa-check-circle" />
                  <div className="adash-kpi-value">
                    {viewingStats?.completedCount ?? 0}
                  </div>
                  <div className="adash-kpi-label">Completed</div>
                </Link>
                <Link href="/notifications" className="adash-kpi-card adash-kpi-teal">
                  <i className="fas fa-bell" />
                  <div className="adash-kpi-value">{unreadCount}</div>
                  <div className="adash-kpi-label">Unread Notifications</div>
                </Link>
                <div className="adash-kpi-card adash-kpi-orange">
                  <i className="fas fa-file-signature" />
                  <div className="adash-kpi-value">{bookings.length}</div>
                  <div className="adash-kpi-label">My Bookings</div>
                </div>
                <Link href="/profile" className="adash-kpi-card adash-kpi-gray">
                  <i className="fas fa-user-check" />
                  <div className="adash-kpi-value">
                    {profile?.completionPercentage ?? 0}%
                  </div>
                  <div className="adash-kpi-label">Profile Complete</div>
                </Link>
              </div>
            </section>

            <div className="adash-panels">
              <section className="adash-section adash-panel">
                <h2 className="adash-section-title">
                  <i className="fas fa-video" /> My Viewing Requests
                </h2>
                {viewingsError ? (
                  <p className="adash-error">{viewingsError}</p>
                ) : viewings.length === 0 ? (
                  <p className="adash-empty">
                    No viewing requests yet. Browse apartments to request a viewing.
                  </p>
                ) : (
                  <ul className="adash-list">
                    {viewings.slice(0, 8).map((v) => (
                      <li key={v.id} className="adash-list-item">
                        <div className="adash-list-primary">
                          <Link
                            href={`/apartments/${v.apartmentId}`}
                            className="adash-list-link"
                          >
                            {v.apartmentTitle}
                          </Link>
                          <span className="adash-list-date">
                            {fmtDate(v.confirmedDateTime || v.proposedDateTime)}
                          </span>
                        </div>
                        <span
                          className={`adash-status-badge ${statusClass(v.status)}`}
                        >
                          {v.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* ── Booking Requests ── */}
              <section className="adash-section adash-panel">
                <h2 className="adash-section-title">
                  <i className="fas fa-file-signature" /> My Booking Requests
                </h2>
                {bookingsError ? (
                  <p className="adash-error">{bookingsError}</p>
                ) : bookings.length === 0 ? (
                  <p className="adash-empty">
                    No booking requests yet. Find an apartment and submit a booking request.
                  </p>
                ) : (
                  <ul className="adash-list">
                    {bookings.slice(0, 8).map((b) => (
                      <li key={b.id} className="adash-list-item">
                        <div className="adash-list-primary">
                          <Link
                            href={`/apartments/${b.apartmentId}`}
                            className="adash-list-link"
                          >
                            {b.apartmentTitle}
                          </Link>
                          <span className="adash-list-sub">
                            {b.reasonType?.replace(/_/g, ' ')} · Move-in: {fmtDate(b.preferredMoveIn)}
                          </span>
                          <span className="adash-list-date">
                            Submitted: {fmtDate(b.createdAt)}
                          </span>
                        </div>
                        <span
                          className={`adash-status-badge ${statusClass(b.status)}`}
                        >
                          {b.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="adash-section adash-panel">
                <h2 className="adash-section-title">
                  <i className="fas fa-heart" /> Favorites
                </h2>
                {favoritesError ? (
                  <p className="adash-error">{favoritesError}</p>
                ) : favorites.length === 0 ? (
                  <p className="adash-empty">
                    You have not saved any apartments yet.
                  </p>
                ) : (
                  <div className="adash-fav-grid">
                    {favorites.map((f) => (
                      <Link
                        key={f.id}
                        href={`/apartments/${f.apartmentId}`}
                        className="adash-fav-card"
                      >
                        <div className="adash-fav-info">
                          <span className="adash-fav-title">
                            {f.apartmentTitle}
                          </span>
                          <span className="adash-fav-city">
                            <i className="fas fa-map-marker-alt" /> {f.apartmentCity}
                          </span>
                        </div>
                        <span className="adash-fav-rent">
                          EUR {f.apartmentMonthlyRent?.toLocaleString() ?? '--'}/mo
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className="adash-section adash-panel">
                <h2 className="adash-section-title">
                  <i className="fas fa-headset" /> Support
                </h2>
                {ticketsError ? (
                  <p className="adash-error">{ticketsError}</p>
                ) : (
                  <>
                    <div className="adash-support-summary">
                      <div className="adash-support-stat">
                        <span className="adash-support-num">
                          {openTickets.length}
                        </span>
                        <span className="adash-support-label">Open tickets</span>
                      </div>
                      <div className="adash-support-stat">
                        <span className="adash-support-num">
                          {tickets.length}
                        </span>
                        <span className="adash-support-label">Total tickets</span>
                      </div>
                    </div>
                    {tickets.length > 0 && (
                      <ul className="adash-list adash-list-compact">
                        {tickets.slice(0, 5).map((t) => (
                          <li key={t.id} className="adash-list-item">
                            <span className="adash-list-primary">
                              {t.subject}
                            </span>
                            <span
                              className={`adash-status-badge ${statusClass(t.status)}`}
                            >
                              {t.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link href="/support" className="adash-section-link">
                      Open support area <i className="fas fa-arrow-right" />
                    </Link>
                  </>
                )}
              </section>
            </div>

            {profile && (
              <section className="adash-section adash-lifestyle">
                <h2 className="adash-section-title">
                  <i className="fas fa-user-tag" /> My Lifestyle Profile
                </h2>
                <div className="adash-lifestyle-grid">
                  <div className="adash-lifestyle-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-map-marker-alt" /> Location
                    </div>
                    <div className="adash-lifestyle-value">
                      {[profile.city, profile.country].filter(Boolean).join(', ') || 'Not set'}
                    </div>
                  </div>
                  <div className="adash-lifestyle-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-smoking-ban" /> Smoking
                    </div>
                    <div className="adash-lifestyle-value">
                      {profile.smokingStatus
                        ? profile.smokingStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                        : 'Not set'}
                    </div>
                  </div>
                  <div className="adash-lifestyle-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-paw" /> Pet Owner
                    </div>
                    <div className="adash-lifestyle-value">
                      {profile.petOwner === true ? 'Yes' : profile.petOwner === false ? 'No' : 'Not set'}
                    </div>
                  </div>
                  <div className="adash-lifestyle-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-gamepad" /> Hobbies
                    </div>
                    <div className="adash-lifestyle-value">
                      {profile.hobbies || 'Not set'}
                    </div>
                  </div>
                  <div className="adash-lifestyle-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-sun" /> Daily Routine
                    </div>
                    <div className="adash-lifestyle-value">
                      {profile.dailyRoutine || 'Not set'}
                    </div>
                  </div>
                  <div className="adash-lifestyle-card adash-lifestyle-tags-card">
                    <div className="adash-lifestyle-label">
                      <i className="fas fa-tags" /> Lifestyle Tags
                    </div>
                    <div className="adash-lifestyle-value">
                      {profile.lifestyleTags ? (
                        <div className="adash-tag-list">
                          {profile.lifestyleTags.split(',').map((tag) => (
                            <span key={tag.trim()} className="adash-tag">{tag.trim()}</span>
                          ))}
                        </div>
                      ) : 'Not set'}
                    </div>
                  </div>
                </div>
                <Link href="/profile" className="adash-section-link">
                  Edit my profile <i className="fas fa-arrow-right" />
                </Link>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="adash-footer">
        <LogoLink size={36} />
        <div className="adash-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </ProtectedRoute>
  )
}
