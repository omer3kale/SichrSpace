'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { apiUrl } from '@/lib/api'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const storeTokens = (tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    email: string
    firstName: string
    lastName: string
    role: string
    id: number
  }) => {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('accessToken', tokens.accessToken)
    storage.setItem('refreshToken', tokens.refreshToken)
    storage.setItem('expiresIn', String(tokens.expiresIn))
    storage.setItem(
      'user',
      JSON.stringify({
        id: tokens.id,
        email: tokens.email,
        firstName: tokens.firstName,
        lastName: tokens.lastName,
        role: tokens.role,
      }),
    )
  }

  const handleLoginSuccess = () => {
    router.push('/')
  }

  const onSubmit = async (data: LoginFormData) => {
    setApiError('')
    setSuccessMsg('')
    setIsSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        storeTokens(result)
        setSuccessMsg('Login successful! Redirecting\u2026')
        setTimeout(handleLoginSuccess, 1500)
      } else {
        setApiError(result.error || result.message || 'Invalid email or password.')
      }
    } catch {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SiteHeader />

      <div className="lg-container">
        <div className="lg-card">
          <div className="lg-card-accent" />

          <div className="lg-logo-section">
            <LogoLink size={56} />
            <h1>Welcome Back</h1>
            <p>Sign in to your secure apartment viewing account</p>
          </div>

          {apiError && (
            <div className="lg-banner lg-banner-error">
              <i className="fas fa-exclamation-circle" /> {apiError}
            </div>
          )}
          {successMsg && (
            <div className="lg-banner lg-banner-success">
              <i className="fas fa-check-circle" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="lg-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className={`lg-input${errors.email ? ' lg-input-error' : ''}`}
                placeholder="Enter your email address"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && <p className="lg-error">{errors.email.message}</p>}
            </div>

            <div className="lg-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`lg-input${errors.password ? ' lg-input-error' : ''}`}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && <p className="lg-error">{errors.password.message}</p>}
            </div>

            <div className="lg-options">
              <label className="lg-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  aria-label="Remember me on this device"
                />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="lg-forgot">Forgot password?</a>
            </div>

            <button type="submit" className="lg-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="lg-spinner" />
              ) : (
                <>
                  <i className="fas fa-sign-in-alt" /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="lg-signup-link">
            Don&apos;t have an account?{' '}
            <a href="/create-account">Create one</a>
          </div>
        </div>

        <div className="lg-benefits">
          <h2>Trusted by thousands</h2>
          <ul>
            <li>
              <i className="fas fa-shield-alt" />
              <div>
                <strong>Verified Listings</strong>
                <span>Every apartment is checked for authenticity before going live.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-comments" />
              <div>
                <strong>Secure Messaging</strong>
                <span>Chat directly with landlords through our encrypted platform.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-lock" />
              <div>
                <strong>GDPR Compliant</strong>
                <span>Your data is protected under the strictest European standards.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-euro-sign" />
              <div>
                <strong>Secure Payments</strong>
                <span>All transactions processed safely through the platform.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <footer className="lg-footer">
        <LogoLink size={36} />
        <div className="lg-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </>
  )
}
