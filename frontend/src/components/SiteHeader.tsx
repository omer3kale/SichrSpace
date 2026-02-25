'use client'

import Link from 'next/link'
import { LogoLink } from '@/components/LogoLink'

/**
 * Unified site-wide header.
 * Layout: LogoLink (left) | Apartments | Login | 🛒 Cart (far right)
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <LogoLink />
      <nav className="site-nav">
        <Link href="/offer" className="site-nav-link">Apartments</Link>
        <Link href="/login" className="site-nav-link">Login</Link>
        <Link href="/cart" className="site-nav-cart" aria-label="Shopping cart">
          <i className="fa-solid fa-cart-shopping" />
        </Link>
      </nav>
    </header>
  )
}
