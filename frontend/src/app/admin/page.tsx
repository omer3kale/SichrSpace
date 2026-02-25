'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { apiUrl } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

type Tab = 'dashboard' | 'tickets' | 'users' | 'reviews' | 'reports' | 'analytics' | 'gdpr'

type AnalyticsSummary = {
  totalUsers: number
  activeListings: number
  completedViewings: number
  openSupportTickets: number
  conversionRate: number
  lastUpdated?: string
}

type GdprSummary = {
  totalExportRequests: number
  pendingExports: number
  completedExports: number
  totalDeletionRequests: number
  pendingDeletions: number
  completedDeletions: number
  isClarityCompliant: boolean
  isGA4Compliant: boolean
  isConsentManagerIntegrated: boolean
  lastAuditAt?: string
}

interface DashboardStats {
  totalUsers: number
  totalTenants: number
  totalLandlords: number
  totalApartments: number
  availableApartments: number
  totalViewingRequests: number
  pendingViewingRequests: number
  totalReviews: number
  pendingReviews: number
  totalConversations: number
  totalNotifications: number
}

interface SupportTicket {
  id: number
  userId: number
  subject: string
  message: string
  category: string
  status: string
  adminResponse: string | null
  resolvedBy: number | null
  createdAt: string
  updatedAt: string
}

interface UserRecord {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
  emailVerified: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface Review {
  id: number
  apartmentId: number
  apartmentTitle: string
  reviewerId: number
  reviewerName: string
  rating: number
  title: string
  comment: string
  status: string
  moderationNotes: string | null
  createdAt: string
}

interface ConversationReport {
  id: number
  conversationId: number
  reporterId: number
  reporterName: string
  reason: string
  status: string
  createdAt: string
  resolvedAt: string | null
  resolvedByName: string | null
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Badge({ text, variant }: { text: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }) {
  return <span className={`ad-badge ad-badge-${variant}`}>{text}</span>
}

function statusVariant(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  const s = status.toUpperCase()
  if (['RESOLVED', 'APPROVED', 'ACTIVE'].includes(s)) return 'green'
  if (['OPEN', 'PENDING', 'PENDING_REVIEW'].includes(s)) return 'yellow'
  if (['REJECTED', 'SUSPENDED', 'LOCKED'].includes(s)) return 'red'
  if (['IN_PROGRESS', 'INVESTIGATING'].includes(s)) return 'blue'
  return 'gray'
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <SiteHeader />

      <div className="ad-layout">
        <nav className="ad-sidebar">
          {([
            ['dashboard', 'fas fa-chart-pie', 'Overview'],
            ['tickets', 'fas fa-headset', 'Support Tickets'],
            ['users', 'fas fa-users', 'Users'],
            ['reviews', 'fas fa-star-half-alt', 'Reviews'],
            ['reports', 'fas fa-flag', 'Reports'],
            ['analytics', 'fas fa-chart-line', 'Analytics'],
            ['gdpr', 'fas fa-shield-alt', 'Advanced GDPR'],
          ] as [Tab, string, string][]).map(([key, icon, label]) => (
            <button
              key={key}
              className={`ad-tab${activeTab === key ? ' ad-tab-active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <i className={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <main className="ad-content">
          {activeTab === 'dashboard' && <DashboardPanel />}
          {activeTab === 'tickets' && <TicketsPanel />}
          {activeTab === 'users' && <UsersPanel />}
          {activeTab === 'reviews' && <ReviewsPanel />}
          {activeTab === 'reports' && <ReportsPanel />}
          {activeTab === 'analytics' && <AnalyticsPanel />}
          {activeTab === 'gdpr' && <GdprPanel />}
        </main>
      </div>
    </ProtectedRoute>
  )
}

function DashboardPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/admin/dashboard'), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      setStats(await res.json())
    } catch {
      setError('Failed to load dashboard stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!stats) return null

  const kpis: [string, number, string, string][] = [
    ['Total Users', stats.totalUsers, 'fas fa-users', 'blue'],
    ['Tenants', stats.totalTenants, 'fas fa-user', 'green'],
    ['Landlords', stats.totalLandlords, 'fas fa-building', 'purple'],
    ['Apartments', stats.totalApartments, 'fas fa-home', 'teal'],
    ['Available', stats.availableApartments, 'fas fa-door-open', 'green'],
    ['Viewing Requests', stats.totalViewingRequests, 'fas fa-video', 'blue'],
    ['Pending Viewings', stats.pendingViewingRequests, 'fas fa-clock', 'yellow'],
    ['Total Reviews', stats.totalReviews, 'fas fa-star', 'purple'],
    ['Pending Reviews', stats.pendingReviews, 'fas fa-hourglass-half', 'yellow'],
    ['Conversations', stats.totalConversations, 'fas fa-comments', 'teal'],
    ['Notifications', stats.totalNotifications, 'fas fa-bell', 'gray'],
  ]

  return (
    <section>
      <h2 className="ad-panel-title">Platform Overview</h2>
      <div className="ad-kpi-grid">
        {kpis.map(([label, value, icon, color]) => (
          <div key={label} className={`ad-kpi-card ad-kpi-${color}`}>
            <i className={icon} />
            <div className="ad-kpi-value">{value.toLocaleString()}</div>
            <div className="ad-kpi-label">{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TicketsPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [respondId, setRespondId] = useState<number | null>(null)
  const [responseText, setResponseText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), size: '15' })
      if (filter) params.set('status', filter)
      const res = await fetch(apiUrl(`/api/admin/support/tickets?${params}`), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data: PageResponse<SupportTicket> = await res.json()
      setTickets(data.content)
      setTotal(data.totalPages)
    } catch {
      setError('Failed to load support tickets.')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const updateTicket = async (id: number, status: string, response?: string) => {
    setActionMsg(null)
    try {
      const body: Record<string, string> = { status }
      if (response) body.response = response
      const res = await fetch(apiUrl(`/api/admin/support/tickets/${id}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setActionMsg({ type: 'ok', text: `Ticket #${id} updated to ${status}.` })
      setRespondId(null)
      setResponseText('')
      load()
    } catch {
      setActionMsg({ type: 'err', text: `Failed to update ticket #${id}.` })
    }
  }

  return (
    <section>
      <div className="ad-panel-header">
        <h2 className="ad-panel-title">Support Tickets</h2>
        <select className="ad-filter" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0) }}>
          <option value="">All statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {actionMsg && (
        <div className={`ad-mini-banner ad-mini-${actionMsg.type}`}>
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)}>&times;</button>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <>
                  <tr key={t.id}>
                    <td>#{t.id}</td>
                    <td>{t.subject}</td>
                    <td>{t.category || '—'}</td>
                    <td><Badge text={t.status} variant={statusVariant(t.status)} /></td>
                    <td>{fmtDate(t.createdAt)}</td>
                    <td className="ad-actions">
                      <button className="ad-btn-sm" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                        {expanded === t.id ? 'Hide' : 'View'}
                      </button>
                      {t.status === 'OPEN' && (
                        <button className="ad-btn-sm ad-btn-blue" onClick={() => updateTicket(t.id, 'IN_PROGRESS')}>
                          In Progress
                        </button>
                      )}
                      {t.status !== 'RESOLVED' && (
                        <button className="ad-btn-sm ad-btn-green" onClick={() => setRespondId(respondId === t.id ? null : t.id)}>
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === t.id && (
                    <tr key={`${t.id}-detail`} className="ad-detail-row">
                      <td colSpan={6}>
                        <div className="ad-detail-card">
                          <p><strong>User ID:</strong> {t.userId}</p>
                          <p><strong>Message:</strong></p>
                          <p className="ad-detail-msg">{t.message}</p>
                          {t.adminResponse && (
                            <>
                              <p><strong>Admin Response:</strong></p>
                              <p className="ad-detail-msg">{t.adminResponse}</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {respondId === t.id && (
                    <tr key={`${t.id}-respond`} className="ad-detail-row">
                      <td colSpan={6}>
                        <div className="ad-respond-form">
                          <textarea
                            className="ad-textarea"
                            placeholder="Type your response to the user..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                          />
                          <div className="ad-respond-actions">
                            <button className="ad-btn-sm ad-btn-green" onClick={() => updateTicket(t.id, 'RESOLVED', responseText)}>
                              Send &amp; Resolve
                            </button>
                            <button className="ad-btn-sm" onClick={() => { setRespondId(null); setResponseText('') }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={6} className="ad-empty">No tickets found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={total} onPage={setPage} />
        </>
      )}
    </section>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl(`/api/admin/users?page=${page}&size=20`), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data: PageResponse<UserRecord> = await res.json()
      setUsers(data.content)
      setTotal(data.totalPages)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const changeRole = async (userId: number, role: string) => {
    setActionMsg(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/role`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setActionMsg({ type: 'ok', text: `User #${userId} role changed to ${role}.` })
      load()
    } catch {
      setActionMsg({ type: 'err', text: `Failed to change role for user #${userId}.` })
    }
  }

  const toggleStatus = async (userId: number, currentlyActive: boolean) => {
    setActionMsg(null)
    const newStatus = currentlyActive ? 'SUSPENDED' : 'ACTIVE'
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/status`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setActionMsg({ type: 'ok', text: `User #${userId} is now ${newStatus}.` })
      load()
    } catch {
      setActionMsg({ type: 'err', text: `Failed to update status for user #${userId}.` })
    }
  }

  return (
    <section>
      <h2 className="ad-panel-title">User Management</h2>

      {actionMsg && (
        <div className={`ad-mini-banner ad-mini-${actionMsg.type}`}>
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)}>&times;</button>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td><Badge text={u.role} variant={u.role === 'ADMIN' ? 'red' : u.role === 'LANDLORD' ? 'blue' : 'green'} /></td>
                  <td>{u.emailVerified ? <i className="fas fa-check-circle" style={{ color: '#10b981' }} /> : <i className="fas fa-times-circle" style={{ color: '#ef4444' }} />}</td>
                  <td><Badge text={u.isActive ? 'ACTIVE' : 'SUSPENDED'} variant={u.isActive ? 'green' : 'red'} /></td>
                  <td>{fmtDate(u.lastLoginAt)}</td>
                  <td className="ad-actions">
                    <select
                      className="ad-role-select"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="TENANT">Tenant</option>
                      <option value="LANDLORD">Landlord</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      className={`ad-btn-sm ${u.isActive ? 'ad-btn-red' : 'ad-btn-green'}`}
                      onClick={() => toggleStatus(u.id, u.isActive)}
                    >
                      {u.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="ad-empty">No users found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={total} onPage={setPage} />
        </>
      )}
    </section>
  )
}

function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl(`/api/admin/reviews/pending?page=${page}&size=15`), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data: PageResponse<Review> = await res.json()
      setReviews(data.content)
      setTotal(data.totalPages)
    } catch {
      setError('Failed to load pending reviews.')
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const moderate = async (reviewId: number, action: 'APPROVED' | 'REJECTED') => {
    setActionMsg(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/reviews/${reviewId}/moderate`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setActionMsg({ type: 'ok', text: `Review #${reviewId} ${action.toLowerCase()}.` })
      load()
    } catch {
      setActionMsg({ type: 'err', text: `Failed to moderate review #${reviewId}.` })
    }
  }

  return (
    <section>
      <h2 className="ad-panel-title">Pending Reviews</h2>

      {actionMsg && (
        <div className={`ad-mini-banner ad-mini-${actionMsg.type}`}>
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)}>&times;</button>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Apartment</th>
                <th>Reviewer</th>
                <th>Rating</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <>
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.apartmentTitle || `Apt #${r.apartmentId}`}</td>
                    <td>{r.reviewerName}</td>
                    <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td>{r.title}</td>
                    <td><Badge text={r.status} variant={statusVariant(r.status)} /></td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td className="ad-actions">
                      <button className="ad-btn-sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        {expanded === r.id ? 'Hide' : 'View'}
                      </button>
                      <button className="ad-btn-sm ad-btn-green" onClick={() => moderate(r.id, 'APPROVED')}>
                        Approve
                      </button>
                      <button className="ad-btn-sm ad-btn-red" onClick={() => moderate(r.id, 'REJECTED')}>
                        Reject
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`} className="ad-detail-row">
                      <td colSpan={8}>
                        <div className="ad-detail-card">
                          <p><strong>Comment:</strong></p>
                          <p className="ad-detail-msg">{r.comment}</p>
                          {r.moderationNotes && (
                            <>
                              <p><strong>Moderation Notes:</strong></p>
                              <p className="ad-detail-msg">{r.moderationNotes}</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {reviews.length === 0 && (
                <tr><td colSpan={8} className="ad-empty">No pending reviews.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={total} onPage={setPage} />
        </>
      )}
    </section>
  )
}

function ReportsPanel() {
  const [reports, setReports] = useState<ConversationReport[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(page), size: '15' })
      if (filter) params.set('status', filter)
      const res = await fetch(apiUrl(`/api/admin/conversations/reports?${params}`), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data: PageResponse<ConversationReport> = await res.json()
      setReports(data.content)
      setTotal(data.totalPages)
    } catch {
      setError('Failed to load conversation reports.')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const updateReport = async (reportId: number, status: string) => {
    setActionMsg(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/conversations/reports/${reportId}`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setActionMsg({ type: 'ok', text: `Report #${reportId} updated to ${status}.` })
      load()
    } catch {
      setActionMsg({ type: 'err', text: `Failed to update report #${reportId}.` })
    }
  }

  return (
    <section>
      <div className="ad-panel-header">
        <h2 className="ad-panel-title">Conversation Reports</h2>
        <select className="ad-filter" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0) }}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {actionMsg && (
        <div className={`ad-mini-banner ad-mini-${actionMsg.type}`}>
          {actionMsg.text}
          <button onClick={() => setActionMsg(null)}>&times;</button>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {error && <ErrorBanner message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Conversation</th>
                <th>Reporter</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>Conv #{r.conversationId}</td>
                  <td>{r.reporterName}</td>
                  <td className="ad-reason-cell">{r.reason}</td>
                  <td><Badge text={r.status} variant={statusVariant(r.status)} /></td>
                  <td>{fmtDate(r.createdAt)}</td>
                  <td className="ad-actions">
                    {r.status === 'PENDING' && (
                      <button className="ad-btn-sm ad-btn-blue" onClick={() => updateReport(r.id, 'INVESTIGATING')}>
                        Investigate
                      </button>
                    )}
                    {r.status !== 'RESOLVED' && r.status !== 'DISMISSED' && (
                      <>
                        <button className="ad-btn-sm ad-btn-green" onClick={() => updateReport(r.id, 'RESOLVED')}>
                          Resolve
                        </button>
                        <button className="ad-btn-sm ad-btn-red" onClick={() => updateReport(r.id, 'DISMISSED')}>
                          Dismiss
                        </button>
                      </>
                    )}
                    {(r.status === 'RESOLVED' || r.status === 'DISMISSED') && (
                      <span className="ad-muted">
                        {r.resolvedByName ? `by ${r.resolvedByName}` : 'Closed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={7} className="ad-empty">No reports found.</td></tr>
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={total} onPage={setPage} />
        </>
      )}
    </section>
  )
}

function AnalyticsPanel() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/admin/analytics/summary'), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      setSummary(await res.json())
    } catch {
      setError('Failed to load analytics data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!summary) return null

  const kpis: [string, string | number, string, string][] = [
    ['Total Users', summary.totalUsers.toLocaleString(), 'fas fa-users', 'blue'],
    ['Active Listings', summary.activeListings.toLocaleString(), 'fas fa-building', 'green'],
    ['Completed Viewings', summary.completedViewings.toLocaleString(), 'fas fa-video', 'purple'],
    ['Open Support Tickets', summary.openSupportTickets.toLocaleString(), 'fas fa-headset', 'yellow'],
    ['Conversion Rate', `${(summary.conversionRate * 100).toFixed(1)}%`, 'fas fa-chart-line', 'teal'],
  ]

  return (
    <section className="ad-panel-analytics">
      <h2 className="ad-panel-title">Platform Analytics</h2>
      <p className="ad-panel-desc">Real-time overview of platform performance and engagement metrics.</p>
      <div className="ad-kpi-grid">
        {kpis.map(([label, value, icon, color]) => (
          <div key={label} className={`ad-kpi-card ad-kpi-${color}`}>
            <i className={icon} />
            <div className="ad-kpi-value">{value}</div>
            <div className="ad-kpi-label">{label}</div>
          </div>
        ))}
      </div>
      {summary.lastUpdated && (
        <p className="ad-muted" style={{ marginTop: 16 }}>
          <i className="fas fa-clock" /> Last updated: {fmtDate(summary.lastUpdated)}
        </p>
      )}
    </section>
  )
}

function GdprPanel() {
  const [summary, setSummary] = useState<GdprSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/admin/gdpr/summary'), { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      setSummary(await res.json())
    } catch {
      setError('Failed to load GDPR compliance data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} onRetry={load} />
  if (!summary) return null

  return (
    <section className="ad-panel-gdpr">
      <h2 className="ad-panel-title">Advanced GDPR Dashboard</h2>
      <p className="ad-panel-desc">Monitor data subject requests and regulatory compliance status.</p>

      <div className="ad-gdpr-grid">
        <div className="ad-gdpr-col">
          <h3 className="ad-gdpr-section-title"><i className="fas fa-file-export" /> Data Export Requests</h3>
          <div className="ad-kpi-grid ad-kpi-grid-sm">
            <div className="ad-kpi-card ad-kpi-blue">
              <div className="ad-kpi-value">{summary.totalExportRequests}</div>
              <div className="ad-kpi-label">Total</div>
            </div>
            <div className="ad-kpi-card ad-kpi-yellow">
              <div className="ad-kpi-value">{summary.pendingExports}</div>
              <div className="ad-kpi-label">Pending</div>
            </div>
            <div className="ad-kpi-card ad-kpi-green">
              <div className="ad-kpi-value">{summary.completedExports}</div>
              <div className="ad-kpi-label">Completed</div>
            </div>
          </div>

          <h3 className="ad-gdpr-section-title" style={{ marginTop: 24 }}><i className="fas fa-trash-alt" /> Data Deletion Requests</h3>
          <div className="ad-kpi-grid ad-kpi-grid-sm">
            <div className="ad-kpi-card ad-kpi-blue">
              <div className="ad-kpi-value">{summary.totalDeletionRequests}</div>
              <div className="ad-kpi-label">Total</div>
            </div>
            <div className="ad-kpi-card ad-kpi-yellow">
              <div className="ad-kpi-value">{summary.pendingDeletions}</div>
              <div className="ad-kpi-label">Pending</div>
            </div>
            <div className="ad-kpi-card ad-kpi-green">
              <div className="ad-kpi-value">{summary.completedDeletions}</div>
              <div className="ad-kpi-label">Completed</div>
            </div>
          </div>
        </div>

        <div className="ad-gdpr-col">
          <h3 className="ad-gdpr-section-title"><i className="fas fa-clipboard-check" /> Compliance Status</h3>
          <div className="ad-compliance-list">
            <div className="ad-compliance-row">
              <span>Microsoft Clarity</span>
              <Badge text={summary.isClarityCompliant ? 'Compliant' : 'Non-compliant'} variant={summary.isClarityCompliant ? 'green' : 'red'} />
            </div>
            <div className="ad-compliance-row">
              <span>Google Analytics 4</span>
              <Badge text={summary.isGA4Compliant ? 'Compliant' : 'Non-compliant'} variant={summary.isGA4Compliant ? 'green' : 'red'} />
            </div>
            <div className="ad-compliance-row">
              <span>Consent Manager</span>
              <Badge text={summary.isConsentManagerIntegrated ? 'Integrated' : 'Not integrated'} variant={summary.isConsentManagerIntegrated ? 'green' : 'yellow'} />
            </div>
          </div>
          {summary.lastAuditAt && (
            <p className="ad-muted" style={{ marginTop: 16 }}>
              <i className="fas fa-calendar-check" /> Last audit: {fmtDate(summary.lastAuditAt)}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="ad-pagination">
      <button disabled={page === 0} onClick={() => onPage(page - 1)}>← Prev</button>
      <span>Page {page + 1} of {totalPages}</span>
      <button disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="ad-loading">
      <span className="ad-spinner" />
      <span>Loading…</span>
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ad-error-banner">
      <i className="fas fa-exclamation-triangle" />
      <span>{message}</span>
      <button className="ad-btn-sm" onClick={onRetry}>Retry</button>
    </div>
  )
}
