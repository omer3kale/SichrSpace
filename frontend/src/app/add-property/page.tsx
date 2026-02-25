'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { PaymentOptions } from '@/components/PaymentOptions'
import { apiUrl } from '@/lib/api'
import { useAuth } from '@/lib/useAuth'
import { getAuthHeaders, getAuthHeadersMultipart } from '@/lib/authHeaders'

/* ── zod schema ── */

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(5000).optional(),
  areaDescription: z.string().max(5000).optional(),
  city: z.string().min(1, 'City is required').max(100),
  district: z.string().max(100).optional(),
  address: z.string().max(255).optional(),
  monthlyRent: z.coerce.number().min(0.01, 'Rent must be > 0').max(999999.99),
  priceWarm: z.coerce.number().min(0.01).max(999999.99).optional().or(z.literal('')),
  depositAmount: z.coerce.number().min(0.01).max(999999.99).optional().or(z.literal('')),
  sizeSquareMeters: z.coerce.number().min(1, 'Size must be ≥ 1 m²').max(99999).optional().or(z.literal('')),
  propertyType: z.string().optional(),
  numberOfBedrooms: z.coerce.number().int().min(0).max(50).optional().or(z.literal('')),
  numberOfBathrooms: z.coerce.number().int().min(0).max(50).optional().or(z.literal('')),
  furnishedStatus: z.string().optional(),
  availableFrom: z.string().min(1, 'Available from is required'),
  moveOutDate: z.string().optional(),
  petFriendly: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  hasElevator: z.boolean().optional(),
  hasBalcony: z.boolean().optional(),
  hasWifi: z.boolean().optional(),
  hasWashingMachine: z.boolean().optional(),
  hasDishwasher: z.boolean().optional(),
  hasAirConditioning: z.boolean().optional(),
  hasHeating: z.boolean().optional(),
  amenities: z.string().max(1000).optional(),
})

type FormData = z.infer<typeof schema>

/* ── helpers ── */

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOUSE', label: 'House' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'LOFT', label: 'Loft' },
  { value: 'SHARED_ROOM', label: 'Shared Room' },
  { value: 'PRIVATE_ROOM', label: 'Private Room' },
]

const FURNISHED_OPTIONS = [
  { value: 'FURNISHED', label: 'Furnished' },
  { value: 'SEMI_FURNISHED', label: 'Semi-furnished' },
  { value: 'UNFURNISHED', label: 'Unfurnished' },
]

/* ── component ── */

export default function AddPropertyPage() {
  const { user, loading: authLoading, isLoggedIn, isLandlord, isTenant } = useAuth()
  const canSubmit = isLoggedIn && isLandlord

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      petFriendly: false,
      hasParking: false,
      hasElevator: false,
      hasBalcony: false,
      hasWifi: false,
      hasWashingMachine: false,
      hasDishwasher: false,
      hasAirConditioning: false,
      hasHeating: false,
    },
  })

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setImageFiles((prev) => [...prev, ...files])
    const previews = files.map((f) => URL.createObjectURL(f))
    setImagePreviews((prev) => [...prev, ...previews])
  }

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      // 1. Upload images if any
      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        const fd = new FormData()
        imageFiles.forEach((f) => fd.append('files', f))
        const uploadRes = await fetch(apiUrl('/api/apartments/images/upload'), {
          method: 'POST',
          headers: getAuthHeadersMultipart(),
          body: fd,
        })
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}))
          throw new Error(body.error || 'Image upload failed')
        }
        const uploadData = await uploadRes.json()
        imageUrls = uploadData.urls ?? []
      }

      // 2. Build payload
      const payload: Record<string, unknown> = {
        title: data.title,
        description: data.description || null,
        areaDescription: data.areaDescription || null,
        city: data.city,
        district: data.district || null,
        address: data.address || null,
        monthlyRent: data.monthlyRent,
        priceWarm: data.priceWarm || null,
        depositAmount: data.depositAmount || null,
        sizeSquareMeters: data.sizeSquareMeters || null,
        propertyType: data.propertyType || null,
        numberOfBedrooms: data.numberOfBedrooms || null,
        numberOfBathrooms: data.numberOfBathrooms || null,
        furnishedStatus: data.furnishedStatus || null,
        availableFrom: data.availableFrom,
        moveOutDate: data.moveOutDate || null,
        petFriendly: data.petFriendly ?? false,
        hasParking: data.hasParking ?? false,
        hasElevator: data.hasElevator ?? false,
        hasBalcony: data.hasBalcony ?? false,
        hasWifi: data.hasWifi ?? false,
        hasWashingMachine: data.hasWashingMachine ?? false,
        hasDishwasher: data.hasDishwasher ?? false,
        hasAirConditioning: data.hasAirConditioning ?? false,
        hasHeating: data.hasHeating ?? false,
        amenities: data.amenities || null,
        images: imageUrls.join(','),
      }

      // 3. Create listing
      const res = await fetch(apiUrl('/api/apartments'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || body.message || `Failed to create listing (${res.status})`)
      }

      const created = await res.json()
      setCreatedId(created.id)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const todayISO = new Date().toISOString().split('T')[0]

  return (
    <>
      <SiteHeader />

      <main className="aprop-main">
        {/* ── Auth gate banner ── */}
        {!authLoading && !isLoggedIn && (
          <div className="aprop-gate">
            <i className="fas fa-lock aprop-gate-icon" />
            <h2>Landlord Account Required</h2>
            <p>
              To list a property you must be signed in with a <strong>Landlord</strong> account.
            </p>
            <div className="aprop-gate-actions">
              <Link href="/login" className="aprop-button-primary">
                <i className="fas fa-sign-in-alt" /> Sign In
              </Link>
              <Link href="/create-account" className="aprop-button-secondary">
                <i className="fas fa-user-plus" /> Create Landlord Account
              </Link>
            </div>
            <p className="aprop-gate-hint">
              Already a tenant? You&apos;ll need a separate landlord account with a different email.
              One email = one role — this prevents fraud and keeps tenants &amp; landlords trustworthy.
            </p>
          </div>
        )}

        {!authLoading && isLoggedIn && !isLandlord && (
          <div className="aprop-gate aprop-gate-wrong-role">
            <i className="fas fa-user-shield aprop-gate-icon" />
            <h2>Landlord Account Required</h2>
            <p>
              You&apos;re signed in as <strong>{user?.firstName} {user?.lastName}</strong> ({isTenant ? 'Tenant' : user?.role}) —
              only <strong>Landlord</strong> accounts can create listings.
            </p>
            <div className="aprop-gate-actions">
              <Link href="/create-account" className="aprop-button-primary">
                <i className="fas fa-user-plus" /> Create a Landlord Account
              </Link>
              <Link href="/offer" className="aprop-button-secondary">
                <i className="fas fa-search" /> Browse Apartments Instead
              </Link>
            </div>
            <p className="aprop-gate-hint">
              SichrPlace enforces one role per account to prevent fraud. Register a new account
              with a different email and select &ldquo;Landlord&rdquo; as the account type.
            </p>
          </div>
        )}

        {/* Success banner */}
        {success && (
          <div className="aprop-banner aprop-banner-success">
            <i className="fas fa-check-circle" /> Listing created successfully!
            <Link href={`/apartments/${createdId}`} className="aprop-banner-link">
              View listing
            </Link>
            <Link href="/landlord-dashboard" className="aprop-banner-link">
              Back to dashboard
            </Link>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="aprop-banner aprop-banner-error">
            <i className="fas fa-exclamation-triangle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="aprop-form">
          <div className="aprop-card">
            {/* ── BASIC INFO ── */}
            <div className="aprop-form-section">
              <h2 className="aprop-section-title">
                <i className="fas fa-edit" /> Basic Information
              </h2>
              <div className="aprop-form-group">
                <label className="aprop-label">Title *</label>
                <input
                  {...register('title')}
                  className="aprop-input"
                  placeholder="e.g. Bright 2-bedroom apartment near city center"
                />
                {errors.title && <span className="aprop-field-error">{errors.title.message}</span>}
              </div>
              <div className="aprop-form-group">
                <label className="aprop-label">Description</label>
                <textarea
                  {...register('description')}
                  className="aprop-textarea"
                  rows={4}
                  placeholder="Describe the apartment, its features, and surroundings..."
                />
              </div>
              <div className="aprop-form-group">
                <label className="aprop-label">Area Description</label>
                <textarea
                  {...register('areaDescription')}
                  className="aprop-textarea"
                  rows={3}
                  placeholder="Describe the neighbourhood, transport links, shops nearby..."
                />
              </div>
            </div>

            {/* ── LOCATION ── */}
            <div className="aprop-form-section">
              <h2 className="aprop-section-title">
                <i className="fas fa-map-marker-alt" /> Location
              </h2>
              <div className="aprop-form-row">
                <div className="aprop-form-group">
                  <label className="aprop-label">City *</label>
                  <input {...register('city')} className="aprop-input" placeholder="Berlin" />
                  {errors.city && <span className="aprop-field-error">{errors.city.message}</span>}
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">District</label>
                  <input {...register('district')} className="aprop-input" placeholder="Kreuzberg" />
                </div>
              </div>
              <div className="aprop-form-group">
                <label className="aprop-label">Address</label>
                <input {...register('address')} className="aprop-input" placeholder="Street name & number" />
              </div>
            </div>

            {/* ── DETAILS ── */}
            <div className="aprop-form-section">
              <h2 className="aprop-section-title">
                <i className="fas fa-info-circle" /> Details
              </h2>
              <div className="aprop-form-row aprop-form-row-3">
                <div className="aprop-form-group">
                  <label className="aprop-label">Monthly Rent (€) *</label>
                  <input
                    {...register('monthlyRent')}
                    type="number"
                    step="0.01"
                    className="aprop-input"
                    placeholder="750.00"
                  />
                  {errors.monthlyRent && (
                    <span className="aprop-field-error">{errors.monthlyRent.message}</span>
                  )}
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Warm Rent (€)</label>
                  <input
                    {...register('priceWarm')}
                    type="number"
                    step="0.01"
                    className="aprop-input"
                    placeholder="850.00"
                  />
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Deposit (€)</label>
                  <input
                    {...register('depositAmount')}
                    type="number"
                    step="0.01"
                    className="aprop-input"
                    placeholder="1500.00"
                  />
                </div>
              </div>
              <div className="aprop-form-row aprop-form-row-3">
                <div className="aprop-form-group">
                  <label className="aprop-label">Size (m²)</label>
                  <input
                    {...register('sizeSquareMeters')}
                    type="number"
                    step="0.1"
                    className="aprop-input"
                    placeholder="65"
                  />
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Bedrooms</label>
                  <input
                    {...register('numberOfBedrooms')}
                    type="number"
                    className="aprop-input"
                    placeholder="2"
                  />
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Bathrooms</label>
                  <input
                    {...register('numberOfBathrooms')}
                    type="number"
                    className="aprop-input"
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="aprop-form-row">
                <div className="aprop-form-group">
                  <label className="aprop-label">Property Type</label>
                  <select {...register('propertyType')} className="aprop-input">
                    <option value="">Select…</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Furnished Status</label>
                  <select {...register('furnishedStatus')} className="aprop-input">
                    <option value="">Select…</option>
                    {FURNISHED_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="aprop-form-row">
                <div className="aprop-form-group">
                  <label className="aprop-label">Available From *</label>
                  <input
                    {...register('availableFrom')}
                    type="date"
                    min={todayISO}
                    className="aprop-input"
                  />
                  {errors.availableFrom && (
                    <span className="aprop-field-error">{errors.availableFrom.message}</span>
                  )}
                </div>
                <div className="aprop-form-group">
                  <label className="aprop-label">Move-out Date</label>
                  <input {...register('moveOutDate')} type="date" className="aprop-input" />
                </div>
              </div>
            </div>

            {/* ── AMENITIES / OPTIONS ── */}
            <div className="aprop-form-section">
              <h2 className="aprop-section-title">
                <i className="fas fa-concierge-bell" /> Amenities & Options
              </h2>
              <div className="aprop-checkbox-grid">
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('petFriendly')} />
                  <i className="fas fa-paw" /> Pet Friendly
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasParking')} />
                  <i className="fas fa-car" /> Parking
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasElevator')} />
                  <i className="fas fa-sort" /> Elevator
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasBalcony')} />
                  <i className="fas fa-sun" /> Balcony
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasWifi')} />
                  <i className="fas fa-wifi" /> Wi-Fi
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasWashingMachine')} />
                  <i className="fas fa-tshirt" /> Washing Machine
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasDishwasher')} />
                  <i className="fas fa-utensils" /> Dishwasher
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasAirConditioning')} />
                  <i className="fas fa-snowflake" /> Air Conditioning
                </label>
                <label className="aprop-checkbox-row">
                  <input type="checkbox" {...register('hasHeating')} />
                  <i className="fas fa-fire" /> Heating
                </label>
              </div>
              <div className="aprop-form-group" style={{ marginTop: 16 }}>
                <label className="aprop-label">Additional Amenities</label>
                <input
                  {...register('amenities')}
                  className="aprop-input"
                  placeholder="e.g. Garden, Gym, Storage room (comma-separated)"
                />
              </div>
            </div>

            {/* ── IMAGES ── */}
            <div className="aprop-form-section">
              <h2 className="aprop-section-title">
                <i className="fas fa-images" /> Photos
              </h2>
              <div className="aprop-upload">
                <button
                  type="button"
                  className="aprop-button-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-plus" /> Add Photos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFilesSelected}
                />
                {imagePreviews.length > 0 && (
                  <div className="aprop-upload-list">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="aprop-upload-item">
                        <img src={src} alt={`Preview ${i + 1}`} className="aprop-upload-thumbnail" />
                        <span className="aprop-upload-name">{imageFiles[i]?.name}</span>
                        <button
                          type="button"
                          className="aprop-upload-remove"
                          onClick={() => removeImage(i)}
                          aria-label="Remove"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {imagePreviews.length === 0 && (
                  <p className="aprop-upload-hint">
                    Upload up to 10 photos (JPEG, PNG, WebP, GIF — max 5 MB each)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── SUBMIT ── */}
          <div className="aprop-actions">
            <Link href="/landlord-dashboard" className="aprop-button-secondary">
              <i className="fas fa-arrow-left" /> Cancel
            </Link>
            <button type="submit" className="aprop-button-primary" disabled={submitting || !canSubmit}>
              {submitting ? (
                <>
                  <span className="aprop-spinner" /> Creating…
                </>
              ) : !canSubmit ? (
                <>
                  <i className="fas fa-lock" /> Landlord Login Required
                </>
              ) : (
                <>
                  <i className="fas fa-check" /> Create Listing
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── OPTIONAL: Promote your listing ── */}
        {success && createdId && (
          <section className="aprop-promo">
            <h2 className="aprop-promo-title">
              <i className="fas fa-rocket" /> Optional: Promote Your Listing
            </h2>
            <p className="aprop-promo-text">
              Get more visibility! A promoted listing appears at the top of search results and
              receives a highlighted badge for 30 days.
            </p>
            <PaymentOptions
              amount={9.99}
              currency="EUR"
              description="Listing promotion (30 days)"
              context="listing_promotion"
              resourceId={createdId}
            />
          </section>
        )}
      </main>

      <footer className="aprop-footer">
        <LogoLink size={36} />
        <div className="aprop-footer-links">
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/">Home</a>
        </div>
        <p>&copy; 2025 SichrPlace. Secure apartment viewing platform.</p>
      </footer>
    </>
  )
}
