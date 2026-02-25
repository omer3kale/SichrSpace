'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LogoLink } from '@/components/LogoLink'
import { SiteHeader } from '@/components/SiteHeader'
import { apiUrl } from '@/lib/api'

/* ------------------------------------------------------------------ */
/*  Types matching ApartmentSearchCardDto                              */
/* ------------------------------------------------------------------ */

type ApartmentCard = {
  id: number
  mainImageUrl: string | null
  city: string
  district: string | null
  pricePerMonth: number
  priceWarm: number | null
  propertyType: string | null
  sizeM2: number | null
  numberOfSingleBeds: number | null
  numberOfDoubleBeds: number | null
  moveInDate: string | null
  moveOutDate: string | null
  furnishedStatus: string | null
  petFriendly: boolean | null
}

type PageMeta = {
  totalElements: number
  totalPages: number
  number: number
  size: number
}

/* ------------------------------------------------------------------ */
/*  Popular quick-search presets                                       */
/* ------------------------------------------------------------------ */

const QUICK_SEARCHES: { icon: string; label: string; apply: () => Partial<FilterState> }[] = [
  { icon: 'fa-solid fa-location-dot', label: 'Berlin',      apply: () => ({ city: 'Berlin' }) },
  { icon: 'fa-solid fa-location-dot', label: 'Munich',      apply: () => ({ city: 'Munich' }) },
  { icon: 'fa-solid fa-location-dot', label: 'Hamburg',     apply: () => ({ city: 'Hamburg' }) },
  { icon: 'fa-solid fa-building',     label: 'Studios',     apply: () => ({ propertyType: 'STUDIO' }) },
  { icon: 'fa-solid fa-wifi',         label: 'WiFi',        apply: () => ({ hasWifi: true }) },
  { icon: 'fa-solid fa-paw',          label: 'Pet Friendly',apply: () => ({ petFriendly: 'true' }) },
  { icon: 'fa-solid fa-couch',        label: 'Furnished',   apply: () => ({ furnished: 'FURNISHED' }) },
  { icon: 'fa-solid fa-car',          label: 'Parking',     apply: () => ({ hasParking: true }) },
]

type FilterState = {
  city: string; district: string
  minPrice: string; maxPrice: string
  propertyType: string; minBedrooms: string
  furnished: string; petFriendly: string
  moveInDate: string; moveOutDate: string
  hasWifi: boolean; hasWashingMachine: boolean
  hasDishwasher: boolean; hasElevator: boolean
  hasAirConditioning: boolean; hasParking: boolean
  sortField: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IE', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

function propertyLabel(t: string | null) {
  if (!t) return null
  const map: Record<string, string> = {
    SHARED_ROOM: 'Shared Room', PRIVATE_ROOM: 'Private Room',
    STUDIO: 'Studio', LOFT: 'Loft', APARTMENT: 'Apartment', HOUSE: 'House',
  }
  return map[t] ?? t.charAt(0) + t.slice(1).toLowerCase()
}

function furnishedLabel(f: string | null) {
  if (!f) return null
  const map: Record<string, string> = {
    FURNISHED: 'Furnished', SEMI_FURNISHED: 'Semi-furnished', UNFURNISHED: 'Unfurnished',
  }
  return map[f] ?? f
}

function imgSrc(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}${url}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OfferPage() {
  /* ---- filter state (single source of truth) ---- */
  const [city, setCity]                       = useState('')
  const [district, setDistrict]               = useState('')
  const [minPrice, setMinPrice]               = useState('')
  const [maxPrice, setMaxPrice]               = useState('')
  const [propertyType, setPropertyType]       = useState('')
  const [minBedrooms, setMinBedrooms]         = useState('')
  const [furnished, setFurnished]             = useState('')
  const [petFriendly, setPetFriendly]         = useState('')
  const [moveInDate, setMoveInDate]           = useState('')
  const [moveOutDate, setMoveOutDate]         = useState('')
  const [hasWifi, setHasWifi]                 = useState(false)
  const [hasWashingMachine, setHasWashingMachine] = useState(false)
  const [hasDishwasher, setHasDishwasher]     = useState(false)
  const [hasElevator, setHasElevator]         = useState(false)
  const [hasAirConditioning, setHasAirConditioning] = useState(false)
  const [hasParking, setHasParking]           = useState(false)
  const [sortField, setSortField]             = useState('id,desc')

  /* ---- advanced section toggle ---- */
  const [showAdvanced, setShowAdvanced]       = useState(false)

  /* ---- data state ---- */
  const [listings, setListings]   = useState<ApartmentCard[]>([])
  const [meta, setMeta]           = useState<PageMeta>({ totalElements: 0, totalPages: 0, number: 0, size: 12 })
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  /* ---------------------------------------------------------------- */
  /*  SINGLE fetch function — the only caller of GET /apartments/search
  /* ---------------------------------------------------------------- */
  const fetchListings = useCallback(async (page = 0) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()

      /* basic filters */
      if (city.trim())     params.set('city', city.trim())
      if (district.trim()) params.set('district', district.trim())
      if (minPrice)        params.set('priceMin', minPrice)
      if (maxPrice)        params.set('priceMax', maxPrice)
      if (propertyType)    params.set('propertyType', propertyType)
      if (minBedrooms)     params.set('rooms', minBedrooms)
      if (furnished)       params.set('furnishedStatus', furnished)
      if (petFriendly === 'true') params.set('petFriendly', 'true')

      /* advanced: dates */
      if (moveInDate)  params.set('moveInDate', moveInDate)
      if (moveOutDate) params.set('moveOutDate', moveOutDate)

      /* advanced: amenities */
      if (hasWifi)            params.set('hasWifi', 'true')
      if (hasWashingMachine)  params.set('hasWashingMachine', 'true')
      if (hasDishwasher)      params.set('hasDishwasher', 'true')
      if (hasElevator)        params.set('hasElevator', 'true')
      if (hasAirConditioning) params.set('hasAirConditioning', 'true')
      if (hasParking)         params.set('hasParking', 'true')

      /* pagination + sort */
      params.set('page', String(page))
      params.set('size', '12')
      params.set('sort', sortField)

      const res = await fetch(apiUrl(`/apartments/search?${params.toString()}`))
      if (!res.ok) throw new Error(`Failed to load apartments (${res.status})`)
      const data = await res.json()

      setListings(data.content ?? [])
      setMeta({
        totalElements: data.totalElements ?? 0,
        totalPages: data.totalPages ?? 0,
        number: data.number ?? 0,
        size: data.size ?? 12,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load apartments.')
    } finally {
      setLoading(false)
    }
  }, [
    city, district, minPrice, maxPrice, propertyType, minBedrooms,
    furnished, petFriendly, moveInDate, moveOutDate,
    hasWifi, hasWashingMachine, hasDishwasher, hasElevator, hasAirConditioning, hasParking,
    sortField,
  ])

  /* initial load */
  useEffect(() => { fetchListings() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* form submit → always reset to page 0 */
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchListings(0) }

  /* reset everything */
  const clearFilters = () => {
    setCity(''); setDistrict(''); setMinPrice(''); setMaxPrice('')
    setPropertyType(''); setMinBedrooms(''); setFurnished(''); setPetFriendly('')
    setMoveInDate(''); setMoveOutDate('')
    setHasWifi(false); setHasWashingMachine(false); setHasDishwasher(false)
    setHasElevator(false); setHasAirConditioning(false); setHasParking(false)
    setSortField('id,desc')
    setTimeout(() => fetchListings(0), 0)
  }

  /* quick-search tag click */
  const applyQuickSearch = (patch: Partial<FilterState>) => {
    if (patch.city !== undefined)     setCity(patch.city)
    if (patch.propertyType !== undefined) setPropertyType(patch.propertyType)
    if (patch.furnished !== undefined) setFurnished(patch.furnished)
    if (patch.petFriendly !== undefined) setPetFriendly(patch.petFriendly)
    if (patch.hasWifi !== undefined)   setHasWifi(patch.hasWifi)
    if (patch.hasParking !== undefined) setHasParking(patch.hasParking)
    /* open advanced panel if an amenity was set */
    if (patch.hasWifi || patch.hasParking) setShowAdvanced(true)
    setTimeout(() => fetchListings(0), 0)
  }

  /* active filter count (for the toggle badge) */
  const advancedCount = [
    moveInDate, moveOutDate,
    hasWifi, hasWashingMachine, hasDishwasher, hasElevator, hasAirConditioning, hasParking,
  ].filter(Boolean).length

  /* ---------------------------------------------------------------- */
  return (
    <div className="offer-layout">
      {/* ======= Top bar ======= */}
      <SiteHeader />

      <main className="offer-main">
        {/* ---- heading ---- */}
        <h1 className="offer-page-title">
          <i className="fa-solid fa-magnifying-glass" /> Available Apartments
        </h1>
        <p className="offer-page-subtitle">
          Advanced search across all SichrPlace listings
        </p>

        {/* ======= Popular search tags ======= */}
        <div className="offer-suggestions">
          <h3 className="offer-suggestions-heading">Popular Searches</h3>
          <div className="offer-suggestions-grid">
            {QUICK_SEARCHES.map((qs) => (
              <button key={qs.label} type="button" className="offer-suggestion-tag"
                onClick={() => applyQuickSearch(qs.apply())}>
                <i className={qs.icon} /> {qs.label}
              </button>
            ))}
          </div>
        </div>

        {/* ======= Search & filters (advanced search form) ======= */}
        <form className="offer-filters" onSubmit={handleSearch}>
          {/* Row 1: location + price */}
          <div className="offer-filter-row">
            <div className="offer-filter-group offer-filter-wide">
              <label className="offer-filter-label">City</label>
              <input className="offer-filter-input" type="text" placeholder="e.g. Munich, Berlin…"
                value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">District</label>
              <input className="offer-filter-input" type="text" placeholder="e.g. Schwabing"
                value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">Min price</label>
              <input className="offer-filter-input" type="number" placeholder="€ min"
                value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">Max price</label>
              <input className="offer-filter-input" type="number" placeholder="€ max"
                value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          {/* Row 2: property type, beds, furnished, pets */}
          <div className="offer-filter-row">
            <div className="offer-filter-group">
              <label className="offer-filter-label">Property type</label>
              <select className="offer-filter-input" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                <option value="">Any</option>
                <option value="APARTMENT">Apartment</option>
                <option value="HOUSE">House</option>
                <option value="STUDIO">Studio</option>
                <option value="LOFT">Loft</option>
                <option value="SHARED_ROOM">Shared Room</option>
                <option value="PRIVATE_ROOM">Private Room</option>
              </select>
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">Bedrooms</label>
              <select className="offer-filter-input" value={minBedrooms} onChange={(e) => setMinBedrooms(e.target.value)}>
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">Furnished</label>
              <select className="offer-filter-input" value={furnished} onChange={(e) => setFurnished(e.target.value)}>
                <option value="">Any</option>
                <option value="FURNISHED">Furnished</option>
                <option value="SEMI_FURNISHED">Semi-furnished</option>
                <option value="UNFURNISHED">Unfurnished</option>
              </select>
            </div>
            <div className="offer-filter-group">
              <label className="offer-filter-label">Pet friendly</label>
              <select className="offer-filter-input" value={petFriendly} onChange={(e) => setPetFriendly(e.target.value)}>
                <option value="">Any</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          {/* ---- Toggle advanced ---- */}
          <button type="button" className="offer-advanced-toggle"
            onClick={() => setShowAdvanced((p) => !p)}>
            <i className={`fa-solid ${showAdvanced ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
            {' '}{showAdvanced ? 'Hide' : 'Show'} advanced filters
            {advancedCount > 0 && <span className="offer-advanced-badge">{advancedCount}</span>}
          </button>

          {showAdvanced && (
            <>
              {/* Row 3: dates */}
              <div className="offer-filter-row">
                <div className="offer-filter-group">
                  <label className="offer-filter-label">Move-in date</label>
                  <input className="offer-filter-input" type="date"
                    value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} />
                </div>
                <div className="offer-filter-group">
                  <label className="offer-filter-label">Move-out date</label>
                  <input className="offer-filter-input" type="date"
                    value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)} />
                </div>
              </div>

              {/* Row 4: amenity checkboxes */}
              <div className="offer-filter-row">
                <div className="offer-filter-group offer-filter-full">
                  <label className="offer-filter-label">Amenities</label>
                  <div className="offer-amenities-grid">
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasWifi}
                        onChange={(e) => setHasWifi(e.target.checked)} />
                      <i className="fa-solid fa-wifi" /> WiFi
                    </label>
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasWashingMachine}
                        onChange={(e) => setHasWashingMachine(e.target.checked)} />
                      <i className="fa-solid fa-shirt" /> Washing Machine
                    </label>
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasDishwasher}
                        onChange={(e) => setHasDishwasher(e.target.checked)} />
                      <i className="fa-solid fa-plate-wheat" /> Dishwasher
                    </label>
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasElevator}
                        onChange={(e) => setHasElevator(e.target.checked)} />
                      <i className="fa-solid fa-elevator" /> Elevator
                    </label>
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasAirConditioning}
                        onChange={(e) => setHasAirConditioning(e.target.checked)} />
                      <i className="fa-solid fa-snowflake" /> Air Conditioning
                    </label>
                    <label className="offer-amenity-check">
                      <input type="checkbox" checked={hasParking}
                        onChange={(e) => setHasParking(e.target.checked)} />
                      <i className="fa-solid fa-car" /> Parking
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ---- action buttons ---- */}
          <div className="offer-filter-actions">
            <button type="submit" className="offer-button-primary">
              <i className="fa-solid fa-search" /> Search Apartments
            </button>
            <button type="button" className="offer-button-secondary" onClick={clearFilters}>
              <i className="fa-solid fa-xmark" /> Clear All
            </button>
          </div>
        </form>

        {/* ======= Results header (count + sort) ======= */}
        {!loading && !error && (
          <div className="offer-results-header">
            <p className="offer-results-count">
              {meta.totalElements === 0
                ? 'No apartments match your search.'
                : `Showing ${listings.length} of ${meta.totalElements} apartments`}
            </p>
            <div className="offer-sort-controls">
              <label htmlFor="offer-sort" className="offer-sort-label">Sort by:</label>
              <select id="offer-sort" className="offer-filter-input offer-sort-select"
                value={sortField}
                onChange={(e) => { setSortField(e.target.value); setTimeout(() => fetchListings(0), 0) }}>
                <option value="id,desc">Newest first</option>
                <option value="pricePerMonth,asc">Price: low → high</option>
                <option value="pricePerMonth,desc">Price: high → low</option>
                <option value="sizeM2,desc">Size: largest first</option>
              </select>
            </div>
          </div>
        )}

        {/* error */}
        {error && (
          <div className="offer-banner offer-banner-error">
            <i className="fa-solid fa-circle-exclamation" /> {error}
          </div>
        )}

        {/* loading */}
        {loading && (
          <div className="offer-loading">
            <div className="offer-spinner" />
            <p>Searching apartments…</p>
          </div>
        )}

        {/* ======= Listings grid ======= */}
        {!loading && listings.length > 0 && (
          <div className="offer-grid">
            {listings.map((apt) => (
              <Link key={apt.id} href={`/offer/${apt.id}`} className="offer-card">
                <div className="offer-card-img">
                  {apt.mainImageUrl ? (
                    <Image
                      src={imgSrc(apt.mainImageUrl)}
                      alt={`${apt.city} apartment`}
                      fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div className="offer-card-placeholder">
                      <i className="fa-solid fa-image" />
                    </div>
                  )}
                </div>

                <div className="offer-card-body">
                  <div className="offer-card-location">
                    <i className="fa-solid fa-location-dot" /> {apt.city}
                    {apt.district && <span className="offer-card-district"> · {apt.district}</span>}
                  </div>

                  <div className="offer-card-price">
                    {fmtCurrency(apt.pricePerMonth)}<span className="offer-card-per"> / month</span>
                    {apt.priceWarm != null && (
                      <span className="offer-card-warm">warm {fmtCurrency(apt.priceWarm)}</span>
                    )}
                  </div>

                  <div className="offer-card-meta">
                    {propertyLabel(apt.propertyType) && (
                      <span className="offer-card-tag">{propertyLabel(apt.propertyType)}</span>
                    )}
                    {apt.sizeM2 != null && <span className="offer-card-tag">{apt.sizeM2} m²</span>}
                    {furnishedLabel(apt.furnishedStatus) && (
                      <span className="offer-card-tag">{furnishedLabel(apt.furnishedStatus)}</span>
                    )}
                    {apt.petFriendly && (
                      <span className="offer-card-tag offer-card-tag-pet">
                        <i className="fa-solid fa-paw" /> Pets OK
                      </span>
                    )}
                  </div>

                  <div className="offer-card-dates">
                    {apt.moveInDate && <span><i className="fa-regular fa-calendar" /> From {fmtDate(apt.moveInDate)}</span>}
                    {apt.moveOutDate && <span> — {fmtDate(apt.moveOutDate)}</span>}
                  </div>

                  {(apt.numberOfSingleBeds || apt.numberOfDoubleBeds) ? (
                    <div className="offer-card-beds">
                      {apt.numberOfSingleBeds != null && apt.numberOfSingleBeds > 0 && (
                        <span><i className="fa-solid fa-bed" /> {apt.numberOfSingleBeds} single</span>
                      )}
                      {apt.numberOfDoubleBeds != null && apt.numberOfDoubleBeds > 0 && (
                        <span><i className="fa-solid fa-bed" /> {apt.numberOfDoubleBeds} double</span>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="offer-card-footer">
                  <span className="offer-card-cta">View details <i className="fa-solid fa-arrow-right" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* empty */}
        {!loading && listings.length === 0 && !error && (
          <div className="offer-empty">
            <i className="fa-solid fa-magnifying-glass offer-empty-icon" />
            <h3>No apartments found</h3>
            <p>Try adjusting your filters or search in a different city.</p>
          </div>
        )}

        {/* ======= Pagination ======= */}
        {!loading && meta.totalPages > 1 && (
          <div className="offer-pagination">
            <button className="offer-page-btn" disabled={meta.number === 0}
              onClick={() => fetchListings(meta.number - 1)}>
              <i className="fa-solid fa-chevron-left" /> Prev
            </button>
            <span className="offer-page-info">Page {meta.number + 1} of {meta.totalPages}</span>
            <button className="offer-page-btn" disabled={meta.number + 1 >= meta.totalPages}
              onClick={() => fetchListings(meta.number + 1)}>
              Next <i className="fa-solid fa-chevron-right" />
            </button>
          </div>
        )}
      </main>

      <footer className="offer-footer">
        <p>&copy; {new Date().getFullYear()} SichrPlace. All rights reserved.</p>
        <p>
          <Link href="/privacy-policy" className="offer-footer-link">Privacy Policy</Link>
          {' | '}
          <Link href="/terms" className="offer-footer-link">Terms of Service</Link>
        </p>
      </footer>
    </div>
  )
}
