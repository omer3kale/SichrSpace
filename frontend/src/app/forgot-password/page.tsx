'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { apiUrl } from '@/lib/api'

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

type ForgotFormData = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [apiError, setApiError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotFormData) => {
    setApiError('')
    setSuccessMsg('')
    setIsSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await res.json()

      if (res.ok) {
        setSuccessMsg(
          result.message ||
            'If an account exists for that email, we\u2019ve sent a password reset link.',
        )
        reset()
      } else {
        // Backend always returns 200 to prevent enumeration,
        // but handle edge-case error responses gracefully.
        setApiError(
          result.error ||
            result.message ||
            'Something went wrong. Please try again.',
        )
      }
    } catch {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────── */}
      <SiteHeader />

      {/* ── Main content ────────────────────────── */}
      <main className="fp-main">
        <div className="fp-card">
          <div className="fp-card-accent" />

          <div className="fp-header">
            <div className="fp-icon-circle">
              <i className="fas fa-key" />
            </div>
            <h1 className="fp-title">Forgot Your Password?</h1>
            <p className="fp-subtitle">
              Enter the email address linked to your account and we&apos;ll send you a
              secure reset link.
            </p>
          </div>

          {/* ── Banners ───────────────────────────── */}
          <div aria-live="polite">
            {apiError && (
              <div className="fp-banner fp-banner-error">
                <i className="fas fa-exclamation-circle" /> {apiError}
              </div>
            )}
            {successMsg && (
              <div className="fp-banner fp-banner-success">
                <i className="fas fa-check-circle" /> {successMsg}
              </div>
            )}
          </div>

          {/* ── Form ──────────────────────────────── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="fp-field">
              <label htmlFor="fp-email" className="fp-label">
                Email Address
              </label>
              <div className="fp-input-wrap">
                <i className="fas fa-envelope fp-input-icon" />
                <input
                  id="fp-email"
                  type="email"
                  className={`fp-input${errors.email ? ' fp-input-error' : ''}`}
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="fp-error">{errors.email.message}</p>
              )}
            </div>

            <button type="submit" className="fp-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="fp-spinner" />
              ) : (
                <>
                  <i className="fas fa-paper-plane" /> Send Reset Link
                </>
              )}
            </button>
          </form>

          {/* ── Helpful info ──────────────────────── */}
          <div className="fp-info">
            <p>
              <i className="fas fa-info-circle" /> The link will expire in{' '}
              <strong>1 hour</strong>. Check your spam/junk folder if you don&apos;t
              see it.
            </p>
          </div>

          {/* ── Back to login ─────────────────────── */}
          <div className="fp-footer-link">
            <a href="/login">
              <i className="fas fa-arrow-left" /> Back to Sign In
            </a>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="fp-footer">
        <LogoLink size={36} />
        <div className="fp-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </>
  )
}
