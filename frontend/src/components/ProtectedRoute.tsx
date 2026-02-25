'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

type AllowedRole = 'TENANT' | 'LANDLORD' | 'ADMIN'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Roles that may access this page. Omit to allow any authenticated user. */
  allowedRoles?: AllowedRole[]
}

/**
 * Wraps a page to enforce authentication and optional role checks.
 *
 * - While the auth state is hydrating it renders a branded loading spinner.
 * - If the user is not logged in it redirects to /login?returnUrl=<current>.
 * - If the user is logged in but their role is not in allowedRoles it
 *   redirects to /unauthorized.
 * - Otherwise it renders children.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, isLoggedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!isLoggedIn) {
      const returnUrl = encodeURIComponent(window.location.pathname)
      router.replace(`/login?returnUrl=${returnUrl}`)
      return
    }

    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user?.role?.toUpperCase() as AllowedRole | undefined
      if (!userRole || !allowedRoles.includes(userRole)) {
        router.replace('/unauthorized')
      }
    }
  }, [loading, isLoggedIn, user, allowedRoles, router])

  /* Still hydrating auth from storage */
  if (loading) {
    return (
      <div className="prot-loading">
        <div className="prot-spinner" />
        <p className="prot-loading-text">Loading...</p>
      </div>
    )
  }

  /* Redirect pending */
  if (!isLoggedIn) {
    return (
      <div className="prot-loading">
        <div className="prot-spinner" />
        <p className="prot-loading-text">Redirecting to login...</p>
      </div>
    )
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toUpperCase() as AllowedRole | undefined
    if (!userRole || !allowedRoles.includes(userRole)) {
      return (
        <div className="prot-loading">
          <div className="prot-spinner" />
          <p className="prot-loading-text">Access denied. Redirecting...</p>
        </div>
      )
    }
  }

  return <>{children}</>
}
