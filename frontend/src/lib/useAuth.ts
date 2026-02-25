'use client'

import { useEffect, useState } from 'react'

export type AuthUser = {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string          // 'LANDLORD' | 'TENANT' | 'ADMIN' (from backend)
}

/**
 * Lightweight auth hook — reads the user object that login stored in
 * localStorage / sessionStorage.  Returns `null` while hydrating (SSR)
 * and when no user is logged in.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem('user') ?? sessionStorage.getItem('user')
      if (raw) setUser(JSON.parse(raw))
    } catch { /* corrupted JSON → treat as logged-out */ }
    setLoading(false)
  }, [])

  const isLoggedIn  = !!user
  const isLandlord  = user?.role?.toUpperCase() === 'LANDLORD'
  const isTenant    = user?.role?.toUpperCase() === 'TENANT'
  const isAdmin     = user?.role?.toUpperCase() === 'ADMIN'

  return { user, loading, isLoggedIn, isLandlord, isTenant, isAdmin }
}
