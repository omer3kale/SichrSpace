'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { LogoLink } from '@/components/LogoLink'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { apiUrl } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

/* ── types ── */

type BookingRequest = {
  id: number
  apartmentId: number
  apartmentTitle: string
  tenantId: number
  tenantName: string
  preferredMoveIn: string | null
  preferredMoveOut: string | null
  reasonType: string | null
  detailedReason: string | null
  payer: string | null
  status: string
  createdAt: string
}

/* ── helpers ── */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDateTime(iso: string | null | undefined): string {
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
  if (s === 'ACCEPTED') return 'lbook-status-accepted'
  if (s === 'DECLINED') return 'lbook-status-declined'
  if (s === 'SUBMITTED' || s === 'DRAFT') return 'lbook-status-pending'
  return 'lbook-status-default'
}

/* ── component ── */

export default function LandlordBookingsPage() {
  const [bookings, setBookings] = useState<BookingRequest[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>('ALL')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/landlord/booking-requests'), {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setBookings(await res.json())
      setError('')
    } catch {
      setError('Failed to load booking requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAction = async (id: number, action: 'accept' | 'decline') => {
    setActionId(id)
    try {
      const res = await fetch(apiUrl(`/api/landlord/booking-requests/${id}/${action}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error(`Failed to ${action}`)
      await load()
    } catch {
      setError(`Could not ${action} booking #${id}.`)
    } finally {
      setActionId(null)
    }
  }

  const filtered =
    filter === 'ALL'
      ? bookings
      : bookings.filter((b) => b.status === filter)

  const counts = {
    all: bookings.length,
    submitted: bookings.filter((b) => b.status === 'SUBMITTED').length,
    accepted: bookings.filter((b) => b.status === 'ACCEPTED').length,
    declined: bookings.filter((b) => b.status === 'DECLINED').length,
  }

  return (
    <ProtectedRoute allowedRoles={['LANDLORD']}>
      <SiteHeader />

      <main className="lbook-main">
        <div className="lbook-header">
          <h1 className="lbook-title">
            <i className="fas fa-file-signature" /> Booking Requests
          </h1>
          <Link href="/landlord-dashboard" className="lbook-back-link">
            <i className="fas fa-arrow-left" /> Back to Dashboard
          </Link>
        </div>

        {/* ── Filter tabs ── */}
        <div className="lbook-filters">
          <button
            className={`lbook-filter-btn ${filter === 'ALL' ? 'lbook-filter-active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All ({counts.all})
          </button>
          <button
            className={`lbook-filter-btn ${filter === 'SUBMITTED' ? 'lbook-filter-active' : ''}`}
            onClick={() => setFilter('SUBMITTED')}
          >
            Pending ({counts.submitted})
          </button>
          <button
            className={`lbook-filter-btn ${filter === 'ACCEPTED' ? 'lbook-filter-active' : ''}`}
            onClick={() => setFilter('ACCEPTED')}
          >
            Accepted ({counts.accepted})
          </button>
          <button
            className={`lbook-filter-btn ${filter === 'DECLINED' ? 'lbook-filter-active' : ''}`}
            onClick={() => setFilter('DECLINED')}
          >
            Declined ({counts.declined})
          </button>
        </div>

        {error && (
          <div className="lbook-banner lbook-banner-error">
            <i className="fas fa-exclamation-triangle" /> {error}
            <button className="lbook-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="lbook-loading">
            <span className="lbook-spinner" />
            <span>Loading bookings…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="lbook-empty">
            <i className="fas fa-inbox" />
            <p>No booking requests {filter !== 'ALL' ? `with status "${filter}"` : 'yet'}.</p>
          </div>
        ) : (
          <div className="lbook-grid">
            {filtered.map((b) => (
              <div key={b.id} className="lbook-card">
                <div className="lbook-card-header">
                  <Link href={`/apartments/${b.apartmentId}`} className="lbook-card-title">
                    {b.apartmentTitle}
                  </Link>
                  <span className={`lbook-badge ${statusClass(b.status)}`}>
                    {b.status}
                  </span>
                </div>

                <div className="lbook-card-details">
                  <div className="lbook-detail">
                    <i className="fas fa-user" />
                    <span>{b.tenantName}</span>
                  </div>
                  <div className="lbook-detail">
                    <i className="fas fa-calendar-alt" />
                    <span>Move-in: {fmtDate(b.preferredMoveIn)}</span>
                  </div>
                  {b.preferredMoveOut && (
                    <div className="lbook-detail">
                      <i className="fas fa-calendar-times" />
                      <span>Move-out: {fmtDate(b.preferredMoveOut)}</span>
                    </div>
                  )}
                  {b.reasonType && (
                    <div className="lbook-detail">
                      <i className="fas fa-briefcase" />
                      <span>{b.reasonType.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {b.payer && (
                    <div className="lbook-detail">
                      <i className="fas fa-wallet" />
                      <span>Payer: {b.payer.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  <div className="lbook-detail lbook-detail-muted">
                    <i className="fas fa-clock" />
                    <span>Submitted: {fmtDateTime(b.createdAt)}</span>
                  </div>
                </div>

                {b.detailedReason && (
                  <div className="lbook-card-reason">
                    <strong>Details:</strong> {b.detailedReason}
                  </div>
                )}

                {b.status === 'SUBMITTED' && (
                  <div className="lbook-card-actions">
                    <button
                      className="lbook-btn-accept"
                      disabled={actionId === b.id}
                      onClick={() => handleAction(b.id, 'accept')}
                    >
                      {actionId === b.id ? '…' : <><i className="fas fa-check" /> Accept</>}
                    </button>
                    <button
                      className="lbook-btn-decline"
                      disabled={actionId === b.id}
                      onClick={() => handleAction(b.id, 'decline')}
                    >
                      {actionId === b.id ? '…' : <><i className="fas fa-times" /> Decline</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="lbook-footer">
        <LogoLink size={36} />
        <div className="lbook-footer-links">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms-of-service">Terms of Service</Link>
          <Link href="/">Home</Link>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </ProtectedRoute>
  )
}
