'use client'

import { useState } from 'react'
import { apiUrl } from '@/lib/api'

type PaymentOptionsProps = {
  /** The amount to charge (in smallest unit display, e.g. 25.00) */
  amount: number
  /** Currency code (default EUR) */
  currency?: string
  /** Human-readable description shown in the UI */
  description: string
  /** Context identifier for backend (e.g. "viewing_payment", "listing_promotion") */
  context: string
  /** Optional viewing-request or resource ID for the backend session call */
  resourceId?: number
  /** Called after successful payment redirect URL is obtained */
  onSuccess?: (provider: string, redirectUrl: string) => void
  /** Called on error */
  onError?: (provider: string, error: string) => void
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
      : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function PaymentOptions({
  amount,
  currency = 'EUR',
  description,
  context,
  resourceId,
  onSuccess,
  onError,
}: PaymentOptionsProps) {
  const [loading, setLoading] = useState<'stripe' | 'paypal' | null>(null)
  const [error, setError] = useState('')

  const createSession = async (provider: 'stripe' | 'paypal') => {
    setLoading(provider)
    setError('')

    try {
      // If a resourceId is provided (e.g. a viewing-request), use that endpoint
      // Otherwise fall back to a generic payment session endpoint
      const endpoint = resourceId
        ? apiUrl(`/api/viewing-requests/${resourceId}/payments/session`)
        : apiUrl('/api/payments/session')

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider, context, amount, currency, description }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || `Payment failed (${res.status})`)
      }

      const data = await res.json()

      if (data.redirectUrl) {
        onSuccess?.(provider, data.redirectUrl)
        window.location.href = data.redirectUrl
      } else {
        onSuccess?.(provider, '')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment request failed'
      setError(msg)
      onError?.(provider, msg)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="pymt-options">
      <div className="pymt-summary">
        <span className="pymt-summary-label">{description}</span>
        <span className="pymt-summary-amount">
          {currency === 'EUR' ? '€' : currency} {amount.toFixed(2)}
        </span>
      </div>

      {error && (
        <div className="pymt-error">
          <i className="fas fa-exclamation-triangle" /> {error}
        </div>
      )}

      <div className="pymt-buttons">
        {/* Stripe */}
        <button
          type="button"
          className="pymt-btn pymt-btn-stripe"
          disabled={loading !== null}
          onClick={() => createSession('stripe')}
        >
          {loading === 'stripe' ? (
            <span className="pymt-spinner" />
          ) : (
            <i className="fab fa-stripe-s" />
          )}
          Pay with Stripe
        </button>

        {/* PayPal */}
        <button
          type="button"
          className="pymt-btn pymt-btn-paypal"
          disabled={loading !== null}
          onClick={() => createSession('paypal')}
        >
          {loading === 'paypal' ? (
            <span className="pymt-spinner" />
          ) : (
            <i className="fab fa-paypal" />
          )}
          Pay with PayPal
        </button>
      </div>

      <div className="pymt-footer">
        <i className="fas fa-shield-alt" /> Secure payment — SSL encrypted
      </div>
    </div>
  )
}
