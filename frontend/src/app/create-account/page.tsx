'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { apiUrl } from '@/lib/api'

/* ── Validation Schema ────────────────────────────────────────── */
const signupSchema = z
  .object({
    role: z.enum(['tenant', 'landlord'], {
      required_error: 'Please select an account type',
    }),
    fullName: z
      .string()
      .min(1, 'Full name is required')
      .regex(/\S+\s+\S+/, 'Please enter both first and last name'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and privacy policy' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormData = z.infer<typeof signupSchema>

/* ── Password Strength Helper ─────────────────────────────────── */
function getPasswordStrength(password: string) {
  if (!password) return { level: 0, label: '', cls: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 2) return { level: 25, label: 'Weak', cls: 'strength-weak' }
  if (score <= 3) return { level: 50, label: 'Fair', cls: 'strength-fair' }
  if (score <= 4) return { level: 75, label: 'Good', cls: 'strength-good' }
  return { level: 100, label: 'Strong', cls: 'strength-strong' }
}

/* ── Component ────────────────────────────────────────────────── */
export default function CreateAccountPage() {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: undefined,
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: undefined as unknown as true,
    },
  })

  const selectedRole = watch('role')
  const passwordValue = watch('password') || ''
  const strength = getPasswordStrength(passwordValue)

  const selectRole = useCallback(
    (role: 'tenant' | 'landlord') => {
      setValue('role', selectedRole === role ? (undefined as unknown as 'tenant') : role, {
        shouldValidate: true,
      })
    },
    [selectedRole, setValue],
  )

  const onSubmit = async (data: SignupFormData) => {
    setApiError('')
    setSuccessMsg('')
    setIsSubmitting(true)

    try {
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.fullName.trim().split(/\s+/)[0],
          lastName: data.fullName.trim().split(/\s+/).slice(1).join(' '),
          email: data.email,
          password: data.password,
          role: data.role,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setSuccessMsg('Account created successfully! Check your email to verify your account.')
        setTimeout(() => router.push('/login'), 2500)
      } else {
        setApiError(result.message || 'Failed to create account. Please try again.')
      }
    } catch {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <SiteHeader />

      {/* ── Main Container ──────────────────────────────────── */}
      <div className="ca-container">
        {/* Left: Signup Card */}
        <div className="ca-card">
          <div className="ca-card-accent" />

          <div className="ca-logo-section">
            <LogoLink size={56} />
            <h1>Create Account</h1>
            <p>Join the most trusted apartment rental platform</p>
          </div>

          {/* API-level error banner */}
          {apiError && (
            <div className="ca-banner ca-banner-error">
              <i className="fas fa-exclamation-circle" /> {apiError}
            </div>
          )}
          {successMsg && (
            <div className="ca-banner ca-banner-success">
              <i className="fas fa-check-circle" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Account Type */}
            <div className="ca-field">
              <label>Account Type</label>
              <div className="ca-type-grid">
                <button
                  type="button"
                  className={`ca-type-btn${selectedRole === 'tenant' ? ' selected' : ''}`}
                  onClick={() => selectRole('tenant')}
                >
                  <i className="fas fa-user" />
                  <strong>Tenant</strong>
                  <span>Looking for apartments</span>
                </button>
                <button
                  type="button"
                  className={`ca-type-btn${selectedRole === 'landlord' ? ' selected' : ''}`}
                  onClick={() => selectRole('landlord')}
                >
                  <i className="fas fa-building" />
                  <strong>Landlord</strong>
                  <span>Listing properties</span>
                </button>
              </div>
              {errors.role && <p className="ca-error">{errors.role.message}</p>}
              <p className="ca-hint">Click the same option again to deselect</p>
              <div className="ca-role-notice">
                <i className="fas fa-shield-alt" />{' '}
                <strong>One role per account.</strong> Each email address is permanently linked to a
                single role (Tenant or Landlord). This prevents fraud and keeps our marketplace
                trustworthy. If you need both, register a second account with a different email.
              </div>
            </div>

            {/* Full Name */}
            <div className="ca-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className={`ca-input${errors.fullName ? ' ca-input-error' : ''}`}
                placeholder="Enter your full name"
                {...register('fullName')}
              />
              {errors.fullName && <p className="ca-error">{errors.fullName.message}</p>}
            </div>

            {/* Email */}
            <div className="ca-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className={`ca-input${errors.email ? ' ca-input-error' : ''}`}
                placeholder="Enter your email"
                {...register('email')}
              />
              {errors.email && <p className="ca-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="ca-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className={`ca-input${errors.password ? ' ca-input-error' : ''}`}
                placeholder="Create a password"
                {...register('password')}
              />
              {passwordValue.length > 0 && (
                <div className="ca-strength-bar">
                  <div className={`ca-strength-fill ${strength.cls}`} style={{ width: `${strength.level}%` }} />
                </div>
              )}
              <p className="ca-hint">At least 8 characters with mix of letters, numbers &amp; symbols</p>
              {errors.password && <p className="ca-error">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="ca-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className={`ca-input${errors.confirmPassword ? ' ca-input-error' : ''}`}
                placeholder="Confirm your password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="ca-error">{errors.confirmPassword.message}</p>}
            </div>

            {/* Terms */}
            <div className="ca-field ca-terms">
              <label>
                <input type="checkbox" {...register('acceptTerms')} />
                <span>
                  I agree to the{' '}
                  <a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </span>
              </label>
              {errors.acceptTerms && <p className="ca-error">{errors.acceptTerms.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" className="ca-submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="ca-spinner" />
              ) : (
                <>
                  <i className="fas fa-user-plus" /> Create Account
                </>
              )}
            </button>
          </form>

          <div className="ca-login-link">
            Already have an account?{' '}
            <a href="/login">Sign In</a>
          </div>
        </div>

        {/* Right: Benefits Panel (visible on larger screens) */}
        <div className="ca-benefits">
          <h2>Why SichrPlace?</h2>
          <ul>
            <li>
              <i className="fas fa-shield-alt" />
              <div>
                <strong>Verified Landlords</strong>
                <span>All landlords are identity-verified for your safety.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-comments" />
              <div>
                <strong>Secure Messaging</strong>
                <span>Chat safely with landlords via our encrypted platform.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-file-contract" />
              <div>
                <strong>Digital Contracts</strong>
                <span>Generate legally-valid rental contracts online.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-video" />
              <div>
                <strong>Apartment Viewings</strong>
                <span>Request professional video viewings from anywhere.</span>
              </div>
            </li>
            <li>
              <i className="fas fa-euro-sign" />
              <div>
                <strong>Secure Payments</strong>
                <span>All deposits and fees processed safely through the platform.</span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="ca-footer">
        <LogoLink size={36} />
        <div className="ca-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. All rights reserved.</p>
      </footer>
    </>
  )
}
