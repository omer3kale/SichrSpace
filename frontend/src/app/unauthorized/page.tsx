import Link from 'next/link'
import { SiteHeader } from '@/components/SiteHeader'
import { LogoLink } from '@/components/LogoLink'

export default function UnauthorizedPage() {
  return (
    <>
      <SiteHeader />

      <main className="unauth-main">
        <div className="unauth-card">
          <div className="unauth-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 className="unauth-title">Access Denied</h1>
          <p className="unauth-text">
            You do not have permission to view this page. This area is restricted
            to users with a specific role.
          </p>
          <p className="unauth-text unauth-text--muted">
            If you believe this is an error, please contact support or try logging
            in with a different account.
          </p>
          <div className="unauth-actions">
            <Link href="/" className="unauth-btn unauth-btn--primary">
              Go to Home
            </Link>
            <Link href="/login" className="unauth-btn unauth-btn--outline">
              Log In
            </Link>
          </div>
        </div>
      </main>

      <footer className="unauth-footer">
        <div className="unauth-footer-inner">
          <LogoLink showName />
          <p>&copy; {new Date().getFullYear()} SichrPlace. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
