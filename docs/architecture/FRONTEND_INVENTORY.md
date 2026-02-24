# SichrPlace Old Frontend — Comprehensive Page-by-Page Inventory

> **Generated:** Read-only analysis of the vanilla HTML/CSS/JS frontend  
> **Total Files Analyzed:** 22 HTML pages, 8 JS modules, 1 manifest, 1 service worker

---

## Platform Overview

| Attribute | Value |
|-----------|-------|
| **Platform** | SichrPlace — verified student apartment rental platform (Germany) |
| **Stack** | Vanilla HTML/CSS/JS (no framework, no build system) |
| **Design System** | CSS custom properties: `--primary: #2563EB`, `--accent: #40E0D0`, `--secondary: #F9FAFB`, `--radius: 18px` |
| **Fonts** | Poppins (headings) + Roboto (body) via Google Fonts |
| **Icons** | Font Awesome 6.x CDN |
| **Backend API** | REST at `http://localhost:3000`, Bearer token auth |
| **Payments** | PayPal SDK (LIVE client-id), Stripe.js (landlord dashboard) |
| **Real-time** | Supabase client CDN (chat) |
| **Maps** | Google Maps API (geocoding, places, geometry, directions) |
| **Analytics** | Google Analytics 4 (`G-2FG8XLMM35`), Microsoft Clarity (`smib1d4kq5`), Facebook Pixel |
| **GDPR** | consentmanager.net CDN, custom cookie-consent.js, consent-manager-bridge.js |
| **PWA** | manifest.json, service-worker.js, pwa-init.js |
| **i18n** | language-switcher.js + translations.json (EN/DE), `data-translate` attributes |
| **User Roles** | Public, Tenant/Applicant, Landlord, Admin |

---

## HTML Pages

---

### 1. `index.html` (1794 lines)
**Role:** Public landing page

**UI Sections:**
- Header with logo, nav (Apartments, Login, Create Account, Marketplace), language switcher slot
- Hero section with search bar → redirects to `apartments-listing.html`
- 4 Feature cards: Verified Listings, Secure Messaging, Advanced Filters, Top Rated
- Customer Service / FAQ / Viewing Service section
- Slider carousel: Top Rated, Applicants, Opinions, Marketplace, Scam Stories
- Viewing Request Modal with €25 viewing fee
- PayPal Payment Modal (for viewing request payment)
- Notification bell with dropdown
- Social CTA bar (LinkedIn, Facebook, Instagram, TikTok)
- Footer with links

**API Endpoints:**
- PayPal SDK (live key) for viewing-request payment flow
- Customer-service form submission (Google Forms integration)

**JS Functionality:**
- Facebook Pixel tracking (placeholder)
- Notification bell toggle
- Viewing request modal → PayPal payment flow
- Slider carousel navigation

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`, PayPal SDK

---

### 2. `login.html` (566 lines)
**Role:** Public authentication page

**UI Sections:**
- Login card: email, password, "Remember Me" checkbox
- Forgot password link → `forgot-password.html`
- Create account link → `create-account.html`
- Footer

**API Endpoints:**
- `POST /auth/login` → `{ success, token, user }`

**JS Functionality:**
- `AuthHandler` class
- Stores token in `localStorage` (or `sessionStorage` if no "Remember Me")
- Role-based redirect: admin → `admin-dashboard.html`, landlord → `landlord-dashboard.html`, tenant → `apartments-listing.html`
- Demo credentials support via `?demo=admin` URL param
- Existing auth check on load (auto-redirect if already logged in)

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`

---

### 3. `create-account.html` (569 lines)
**Role:** Public registration page

**UI Sections:**
- Account type selector: Tenant / Landlord toggle (with deselect)
- Full name, email, password with strength indicator, confirm password
- Footer

**API Endpoints:**
- `POST /api/register` → `{ redirectUrl }`

**JS Functionality:**
- `SignupManager` class
- Account type selection/deselection UI
- Password strength checker (4 levels: weak → strong)
- Form validation with loading states

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`

---

### 4. `advanced-search.html` (851 lines)
**Role:** Public search page

**UI Sections:**
- Header nav
- Popular Searches suggestions (loaded from API)
- Advanced search form: query, location, property type (apartment/studio/shared-room/private-room), price range, bedrooms, move-in/out dates, amenities checkboxes (WiFi, washing machine, dishwasher, balcony, parking, pet-friendly)
- Sort controls (newest, price, size)
- Results display with apartment cards
- Save Alert button

**API Endpoints:**
- `GET localhost:3000/api/search/advanced?{params}`
- `GET localhost:3000/api/search/popular?limit=8`
- `POST localhost:3000/api/search/save-alert`

**JS Functionality:**
- `performSearch()`, `buildSearchParams()`, `displaySearchResults()`
- `quickSearch()` from popular suggestions
- `saveSearchAlert()` (requires auth)
- `loadPopularSearches()` on load
- Debounced auto-search on filter change
- `updateNavigation()` (shows user menu if logged in)

**Auth:** Uses `localStorage` userToken and userName

---

### 5. `apartments-listing.html` (1540 lines)
**Role:** Public / authenticated listing browser

**UI Sections:**
- Header with logo, nav, language switcher slot, Login/Create Account (or user menu if logged in)
- Enhanced search bar with inline price/bedrooms filters
- Filters modal: city, dates, price, property type, amenities multi-select, bed type, rooms
- Listings container (card grid)
- Footer

**API Endpoints:**
- `GET localhost:3000/api/apartments`
- `POST localhost:3000/api/favorites`
- `GET localhost:3000/api/favorites`
- `POST localhost:3000/api/recently-viewed`

**JS Functionality:**
- `loadApartments()`, `renderApartments()`
- `toggleFavorite()` with backend sync
- `loadUserFavorites()` on load (if auth)
- `trackApartmentView()` → recently-viewed API
- `openOfferDetails(id)` → navigates to `offer.html?id=`
- User dropdown menu: favorites, notifications, recently viewed, profile, logout
- `showNotification()` toast system

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`

---

### 6. `offer.html` (857 lines)
**Role:** Public / authenticated apartment detail page

**UI Sections:**
- Header with back, booking, how-to-book buttons
- Left column: Image gallery carousel, share/wishlist buttons, title, address, price, deposit, details grid, amenities, description, area description, full amenities list, availability dates
- Right column: Landlord info panel, message button, booking button, how-to-book, customer service contact
- Location & Distance section with Google Maps embed
- Chat Modal (message landlord)
- Booking Request Modal: move-in/out dates, tenant names, reason for moving, living habits, payer info
- How to Book Modal (12-step instruction guide)
- Legacy Messaging Modal

**API Endpoints:**
- `POST localhost:3000/api/booking-request`
- Google Maps Geocoding API

**JS Functionality:**
- Image carousel (prev/next)
- Wishlist via `localStorage`
- Chat modal open/close
- Booking request form submission
- `LocationServices` class integration for distance widget
- Google Maps initialization with geocoding

**Scripts Loaded:** `language-switcher.js`, `location-services.js`, `logo-cookie-manager.js`, Google Maps API

---

### 7. `chat.html` (1944 lines)
**Role:** Authenticated messaging page (Supabase real-time)

**UI Sections:**
- Header nav
- Sidebar (360px): conversation list with search, new message button, user online indicators, user type badges (Tenant/Landlord)
- Main chat area: message bubbles (sent/received), typing indicators, attachments support, chat actions
- Empty state when no conversation selected

**API Endpoints:**
- Supabase real-time subscriptions (conversations, messages, presence)
- Backend API for message history and user data

**JS Functionality:**
- Supabase client initialization
- `FrontendRealtimeChat` class integration
- Conversation list management
- Message sending/receiving in real-time
- Typing indicators (broadcast)
- Online/offline presence tracking
- Browser notifications for new messages
- Read receipts

**Scripts Loaded:** Supabase CDN, `realtime-chat.js`, Microsoft Clarity, GA4

---

### 8. `chat-new.html` (1521 lines)
**Role:** Authenticated messaging page (newer version, no Supabase)

**UI Sections:**
- Similar to `chat.html`: sidebar with conversations, main chat area
- Message bubbles with attachment support
- Uses Segoe UI font (different design feel)

**Scripts Loaded:** Microsoft Clarity, GA4

---

### 9. `landlord-dashboard.html` (1658 lines)
**Role:** Landlord management dashboard

**UI Sections:**
- Sidebar navigation
- Dashboard overview cards
- Apartment listing form (create/edit property)
- Messages section: conversation list + chat area
- Viewing & Contract Generation section
- Applicants section with compare modal
- Payment section (revenue tracking)

**API Endpoints:**
- Property CRUD operations
- Viewing request management
- Applicant management
- Payment/revenue APIs

**JS Functionality:**
- Property listing form management
- Messaging interface
- Applicant comparison
- Contract generation
- Payment tracking

**Scripts Loaded:** Stripe.js, `paypal-integration.js`

---

### 10. `applicant-dashboard.html` (736 lines)
**Role:** Tenant/applicant dashboard

**UI Sections:**
- Sidebar: Profile, My Applications, Wishlist, Last Seen, Messages
- Dashboard cards: My Applications (with viewing button), Notifications, Profile Completion
- Profile form (extensive): photo upload, name, email, platform ID, ID document upload, selfie/video verification, student status, age, phone, DOB, income, living preference, disabilities, pets, SCHUFA document upload, moving date
- Applications table
- Wishlist section
- Last Seen (recently viewed) section
- Messages section

**API Endpoints:**
- `POST /api/update-profile`
- Application tracking APIs

**JS Functionality:**
- Sidebar navigation with JS-templated content sections
- Profile form submission
- Application status tracking
- Wishlist management

---

### 11. `admin-dashboard.html` (607 lines)
**Role:** Comprehensive admin dashboard

**UI Sections:**
- Overview cards: Active/Total/Verified/Expired Listings, New Renters/Landlords count, Apartment Checks, User Satisfaction
- Renters table with filters
- Landlords table with filters
- All Listings table
- Upload Queue (Video Footage) with secure viewing links
- Account Rep Tracker & Turnaround Analytics
- Messaging/Support Center: flagged conversations, open tickets, FAQ macro manager
- Payments & Transactions: revenue dashboard, fraud flags, refund/dispute management
- Trust & Safety Tools: reported users/listings, GDPR requests, flag pattern tracker
- Analytics & Insights: user heatmap, peak usage times, top queries, match success rate

**API Endpoints:**
- `GET /api/admin/login-check`
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `POST /api/admin/users/{username}/verify`
- `POST /api/admin/users/{username}/suspend`
- `POST /api/admin/users/{username}/deactivate`
- `GET /api/admin/offers`
- `POST /api/admin/offers/{id}/highlight`
- `POST /api/admin/offers/{id}/deactivate`
- `POST /api/admin/offers/{id}/activate`
- `GET /api/admin/upload-queue`
- `GET /api/admin/video-links`
- `GET /api/admin/account-reps`
- `GET /api/admin/messages`
- `POST /api/admin/messages/{idx}/resolve`

---

### 12. `admin.html` (1190 lines)
**Role:** Operational admin dashboard (alternate version)

**UI Sections:**
- Header with logout
- Navigation: Users, Offers, Viewing Requests, Messages, Video Management, Email Management, Analytics, GDPR Dashboard link
- Quick action buttons
- Viewing Request submission form
- User Management table
- Offer Management table
- Viewing Requests table
- Support Messages table
- Video Management: upload form with secure player, video library with search, preview modal with DRM notice
- Email Management: config test, 3-email workflow system:
  - Email #1: Request Confirmation (auto-send)
  - Email #2: Viewing + Payment (manual trigger)
  - Email #3: Results Ready (manual trigger)

**JS Functionality:**
- Tab-based section switching
- User/offer/viewing request CRUD
- Video upload and management
- Email sending workflow
- Analytics view

---

### 13. `viewing-request.html` (733 lines)
**Role:** Public viewing request form with PayPal payment

**UI Sections:**
- Header nav
- Form: apartment address, reference ID, name, email, phone, preferred date/time, additional info, budget range (€500-800 to €2000+), additional guests count
- PayPal payment section (€25.00 EUR viewing fee)
- Success/error messages

**API Endpoints:**
- Google Forms submission (no-cors mode) — captures form data externally
- `POST /api/emails/send-request-confirmation` (Email #1 auto-send)
- `POST /api/create-viewing-order` (PayPal order creation)
- `POST /api/capture-viewing-order/{orderID}` (PayPal capture)

**JS Functionality:**
- Google Forms field mapping (10 fields)
- Form submission → Google Forms + confirmation email → PayPal payment flow
- `generateRequestId()` — unique ID: `VR-{timestamp}-{random}`
- `initializePayPalButton()` — PayPal Buttons rendering
- PayPal `createOrder` → `onApprove` → success display with transaction ID
- Error handling with retry for `INSTRUMENT_DECLINED`

---

### 14. `viewing-requests-dashboard.html` (1082 lines)
**Role:** Authenticated viewing requests management

**UI Sections:**
- 3 tabs: My Requests, My Properties, New Request
- Stats cards per tab: Total/Pending/Approved/Completed counts
- Filters: status, date range
- Request cards with status badges (pending/approved/rejected/completed)
- Create Request form: apartment select, preferred + 2 alternative dates, phone, message, €25 booking fee
- Request Details modal

**API Endpoints:**
- `GET /api/auth/verify` (auth check)
- `GET /api/apartments` (populate form dropdown)
- `GET /api/viewing-requests/my-requests`
- `GET /api/viewing-requests/my-properties`
- `POST /api/viewing-requests` (create new)
- `PATCH /api/viewing-requests/{id}/approve`
- `PATCH /api/viewing-requests/{id}/reject`
- `PATCH /api/viewing-requests/{id}/complete`
- `DELETE /api/viewing-requests/{id}` (cancel)

**JS Functionality:**
- `checkAuthentication()` with redirect
- Tab switching
- `loadMyRequests()`, `loadPropertyRequests()`, `loadApartments()`
- Request CRUD: approve (with confirmed date prompt), reject (with reason), complete, cancel
- Stats calculation from request data
- Date formatting utilities

---

### 15. `marketplace.html` (1090 lines)
**Role:** Public / authenticated second-hand marketplace

**UI Sections:**
- Header nav
- Hero: "SichrPlace Second-hand Marketplace" — safe transactions, 2% platform fee, local pickup
- Tabs: Want to Buy / Want to Sell
- Filters: search, category (Bedroom/Kitchen/Living Room/Hallway/Cleaning/Decoration), condition (Pre-owned/Refurbished/Vintage/Like New), city, postal code, price range
- Buy tab: 6 hardcoded offer cards (bed frame €85, kitchen mixer €185, armchair €145, desk €75, vacuum €165, wall art €45) — each with Message, Buy Now, Favorite buttons
- Sell tab: Active offers with edit/promote options, sales dashboard (3 Active, 12 Sold, €450 Earned), seller tips
- Payment modal with PayPal integration + card fallback
- Promote modal (€5.99 for 7-day boost)
- Footer (dual footers)

**API Endpoints:**
- PayPal payment flow via `paypal-integration.js`
- `POST /api/paypal/marketplace/capture`
- Backend messaging (`chat.html?item=...`)

**JS Functionality:**
- `isLoggedIn()` check → login prompt banner if not authenticated
- Tab switching
- `toggleFavorite()` with GA4 tracking
- `messageOwner()` → redirect to chat
- `initiatePayment()` → PayPal modal with 2% fee calculation
- `initializeMarketplacePayPal()` → `paypalIntegration.createMarketplacePaymentButton()`
- `applyFilters()` — client-side DOM filtering with result count
- `clearFilters()`
- Seller actions: `createOffer()`, `viewChats()`, `editOffer()`, `promoteOffer()`, `markAsSold()`, `confirmHandover()`
- `showNotification()` toast system
- GA4 event tracking: tab_switch, filter_applied, message_seller, begin_checkout, purchase, login_required

**Scripts Loaded:** PayPal SDK, `paypal-integration.js`, consentmanager.net, `consent-manager-bridge.js`, Microsoft Clarity, GA4, `language-switcher.js`

---

### 16. `property-map.html` (581 lines)
**Role:** Authenticated property map with Google Maps

**UI Sections:**
- Map controls sidebar: location search, radius selector (1-20km), place type buttons, "Use My Location" button
- Google Maps embed (centered on Berlin by default)
- Property results cards with distance badges
- Loading spinner, error/success messages

**API Endpoints:**
- `GET /api/maps/place-types`
- `POST /api/maps/search-by-location`
- `POST /api/maps/reverse-geocode`
- `POST /api/maps/nearby-apartments`
- `POST /api/maps/nearby-places`

**JS Functionality:**
- `PropertyMapManager` class
- Google Maps initialization (Berlin default center)
- Location search with geocoding
- Geolocation (`navigator.geolocation`)
- Nearby apartments search
- Place type selection with nearby places markers
- Property cards with click-to-zoom
- Custom SVG markers for apartments and places
- Info windows on marker click

**Scripts Loaded:** Bootstrap 5.1.3, Font Awesome, Google Maps API

---

### 17. `forgot-password.html` (300 lines)
**Role:** Public password reset request

**UI Sections:**
- Nav with "Back to Sign In" link
- Card: email input, "Send Reset Link" button
- Success state: confirmation with email display, resend option, tips (check spam, link expires in 1 hour)
- Help section: Account Security, Contact Support (support@sichrplace.com)

**API Endpoints:**
- `POST /api/auth/forgot-password`

**JS Functionality:**
- `handlePasswordReset()` with loading states
- Resend link button
- `showAlert()` for success/error messages

**Scripts Loaded:** TailwindCSS CDN, Font Awesome

---

### 18. `reset-password.html` (412 lines)
**Role:** Public password reset form (token-based)

**UI Sections:**
- Nav with "Back to Sign In" link
- Loading state: "Verifying reset token..."
- Reset form: new password (with toggle visibility), confirm password, strength indicator (4-bar), requirements checklist (length, lowercase, uppercase, number, special char)
- Invalid token state: with "Request New Reset Link" button → `forgot-password.html`
- Success state: "Password Reset Successful!" → `login.html?message=reset`
- Security notice: link single-use, expires in 1 hour, signs out all devices

**API Endpoints:**
- `POST /api/auth/verify-reset-token`
- `POST /api/auth/reset-password`

**JS Functionality:**
- Token extraction from URL `?token=`
- `verifyResetToken()` on load
- `handlePasswordReset()` with strength validation (minimum score 3)
- `calculatePasswordStrength()` — 5-criteria scoring
- `updateRequirements()` — real-time checklist UI
- `togglePasswordVisibility()`
- State management: loading → reset/invalidToken → success

**Scripts Loaded:** TailwindCSS CDN, Font Awesome

---

### 19. `verify-email.html` (500 lines)
**Role:** Public email verification page

**UI Sections:**
- Nav with "Back to Sign In"
- Initial state: "Check Your Email" with email display, resend button, change email button
- Success state: "Email Verified!" → `login.html?message=verified`
- Error state: "Verification Failed" with retry button
- Change email form: new email input
- Help section: support email, verification links expire in 24 hours

**API Endpoints:**
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/change-email`

**JS Functionality:**
- Token/email extraction from URL params
- `verifyEmailToken()` on load (if token present)
- `resendVerificationEmail()`
- `handleEmailChange()` — update email + resend verification
- State management: initial/success/error/changeEmailForm
- `showAlert()` with auto-dismiss

**Scripts Loaded:** TailwindCSS CDN, Font Awesome

---

### 20. `privacy-policy.html` (554 lines)
**Role:** Public legal page — GDPR privacy policy

**UI Sections:**
- Header nav, back link
- Full privacy policy document (13 sections):
  1. Who We Are (Data Controller: SichrPlace, DPO: sichrplace@gmail.com)
  2. Personal Data Collected (account info, profile data, property listings, communications, technical data, cookies)
  3. Legal Basis for Processing (table: 6 purposes with legal basis)
  4. How We Use Data (8 purposes)
  5. Data Sharing (other users, service providers, legal requirements)
  6. International Transfers (SCCs, adequacy decisions)
  7. Data Retention (table: account until deletion, listings 2yr, messages 3yr, logs 1yr)
  8. GDPR Rights (7 rights: access, rectification, erasure, portability, restriction, objection, automated decisions)
  9. Cookies & Tracking (essential, functional, analytics with Microsoft Clarity detail, marketing)
  10. Data Security
  11. Children's Privacy (under 16)
  12. Changes to Policy
  13. Contact & Complaints
- Footer

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`

---

### 21. `terms-of-service.html` (617 lines)
**Role:** Public legal page — Terms of Service

**UI Sections:**
- Header nav, back link
- Full terms document (11+ sections):
  1. About SichrPlace (German law, GDPR, Mietrecht)
  2. Acceptance of Terms
  3. User Accounts & Eligibility (18+, legal capacity)
  4. Platform Services (for landlords: 5 features; for tenants: 5 features)
  5. User Responsibilities (prohibited activities, content standards, German rental law compliance: AGG, Mietpreisbremse)
  6. Financial Terms (service fees, payment terms, refund policy)
  7. Intellectual Property
  8. Privacy & Data Protection
  9. Platform Availability & Modifications
  10. Limitation of Liability (intermediary disclaimer)
  11. Dispute Resolution
- Footer

**Scripts Loaded:** `language-switcher.js`, `logo-cookie-manager.js`

---

### 22. `privacy-settings.html` (777 lines)
**Role:** Authenticated user privacy management

**UI Sections:**
- Header nav
- Cookie & Tracking Preferences: toggle switches for Essential (locked on), Functional, Analytics, Marketing cookies
- GDPR Data Rights section:
  - Quick actions: Download My Data, Delete My Account
  - GDPR Request form: type (access/rectification/deletion/portability/restriction/objection), description
  - My Requests list
- Additional Privacy Options: Email Notifications, Marketing Emails, Profile Visibility toggles

**API Endpoints:**
- `GET /api/gdpr/consent` (load consent)
- `POST /api/gdpr/consent` (save consent with privacy policy/terms versions)
- `GET /api/gdpr/export` (request data export)
- `DELETE /api/gdpr/account` (request deletion, requires `DELETE_MY_ACCOUNT` confirmation)
- `POST /api/gdpr/request` (submit GDPR request)
- `GET /api/gdpr/requests` (list user's requests)

**JS Functionality:**
- Auth check → redirect to login if not authenticated
- `loadUserConsent()`, `saveConsentSettings()`
- `downloadMyData()` → export request
- `requestAccountDeletion()` → prompt confirmation → delete
- `submitGdprRequest()` → GDPR request form
- `loadMyRequests()` → display request history with status
- `savePrivacySettings()` → additional toggles

---

### 23. `advanced-gdpr-dashboard.html` (1385 lines)
**Role:** Admin GDPR compliance dashboard

**UI Sections:**
- Admin header with gradient
- 7 tabs: Dashboard, Consent Management, Data Breaches, DPIA Management, Compliance Scan, Processing Logs, Reports
- **Dashboard tab:** Compliance score circle (85% "Good"), Consent statistics (total/active/expired/rate), Data breach statistics (total/unresolved/unreported), DPIA status, Critical alerts, Recent activity
- **Consent tab:** Consent purposes table, cleanup expired consents button
- **Breaches tab:** Breach management table, "Report New Breach" button → modal (title, severity, description, data types affected)
- **DPIA tab:** Data Processing Impact Assessment table, "Create New DPIA" button → modal (activity name, controller, purpose, data categories)
- **Compliance tab:** Full compliance scan trigger, results display
- **Logs tab:** Data processing logs with filter (user_created, data_accessed, data_modified, consent_recorded, breach_discovered)
- **Reports tab:** Compliance report export (period: 7/30/90/365 days, format: JSON/CSV), Automated tasks (daily check, cleanup old data, send reminders)

**API Endpoints:**
- `GET /api/admin/advanced-gdpr/compliance/dashboard`
- Consent management CRUD
- Breach reporting and management
- DPIA management
- Compliance scanning
- Processing log retrieval

**JS Functionality:**
- `loadDashboardData()` → compliance overview
- Tab-based navigation with data loading
- `updateComplianceScore()`, `updateStatistics()`
- `loadCriticalAlerts()`, `loadRecentActivity()`
- Modal management: `showModal()`, `hideModal()`
- Report export functionality
- Automated compliance tasks

---

## JavaScript Modules

---

### `js/language-switcher.js` (175 lines)
**Purpose:** Bilingual support (English / German)

- `LanguageSwitcher` class
- Loads translations from `/js/translations.json` (falls back to hardcoded defaults)
- Creates `<select>` dropdown (🇺🇸 English / 🇩🇪 Deutsch) appended to nav
- Persists language in `localStorage` key `sichrplace-language`
- `applyLanguage()` — iterates `[data-translate]` elements, sets `textContent` or `placeholder`
- Default translations: 30+ keys covering nav, hero, features, registration, buttons, footer

---

### `js/realtime-chat.js` (373 lines)
**Purpose:** Supabase-powered real-time chat

- `FrontendRealtimeChat` class
- **Channels:** `conversation:{id}` with postgres_changes (INSERT/UPDATE on `messages`), broadcast (typing), presence (online status)
- `joinConversation()` — subscribe to Supabase channel
- `sendMessage()` — insert into Supabase `messages` table, update `conversations.last_message_at`
- `sendTyping()` — broadcast typing indicator, auto-stops after 3s
- `markAsRead()` — update `messages.read_at`
- Presence tracking: `trackPresence()`, `updateOnlineUsers()`, `.user-online-indicator` DOM updates
- Browser notifications for unfocused tab
- `requestNotificationPermission()`, `leaveConversation()`, `cleanup()`
- Exported as `window.FrontendRealtimeChat`

---

### `js/paypal-integration.js` (469 lines)
**Purpose:** PayPal SDK wrapper for all payment flows

- `PayPalIntegration` class
- `initializeSDK()` — fetches config from `/api/paypal/config`, dynamically loads SDK script (EUR, de_DE locale)
- `createViewingPaymentButton(containerId, viewingData)` — €25 viewing fee, calls `/api/paypal/create` + `/api/paypal/execute`
- `createPremiumPaymentButton(containerId, premiumData)` — variable amount for premium features
- `createMarketplacePaymentButton(options)` — marketplace item purchase with seller info, calls `actions.order.create()` client-side, captures via `/api/paypal/marketplace/capture`
- `submitViewingRequest()` — post-payment viewing request submission to `/api/viewing-request`
- `showMessage()` / `createMessageContainer()` — inline feedback UI
- Auto-initializes: `window.paypalIntegration = new PayPalIntegration()`

---

### `js/google-analytics-config.js` (334 lines)
**Purpose:** GDPR-compliant Google Analytics 4

- `GoogleAnalyticsManager` class
- Consent-gated initialization: listens for `cookieConsentChanged` events
- `checkExistingConsent()` — reads `localStorage.cookieConsent`
- `initializeGoogleAnalytics()` — loads gtag.js, configures with:
  - `anonymize_ip: true`
  - `allow_google_signals: false`
  - `restricted_data_processing: true`
  - Cookie: 30-day expiry, `SameSite=Strict;Secure`
  - Default consent: analytics granted, all ad signals denied
- `terminateGoogleAnalytics()` — revokes consent, clears 11 GA cookie types
- `trackPageView()`, `trackEvent()`, `trackSearch()`, `trackUserAction()`
- Debug mode on localhost

---

### `js/cookie-consent.js` (562 lines)
**Purpose:** Cookie consent banner with customize modal

- `CookieConsent` class
- Persists in `localStorage` key `sichrplace_cookie_consent`
- Banner: bottom-fixed bar with Reject / Customize / Accept All buttons
- Customize modal: Essential (locked), Functional, Analytics, Marketing toggles
- `acceptAll()` / `rejectAll()` / custom save
- `applyConsentSettings()` — dispatches `cookieConsentChanged` custom event
- `recordConsentAPI(consent)` — sends to `/api/gdpr/consent` backend
- `clearTrackingCookies()` — removes GA + Clarity cookies on reject
- Microsoft Clarity integration: `enableClarity()` / `disableClarity()`

---

### `js/consent-manager-bridge.js` (349 lines)
**Purpose:** Bridges consentmanager.net with Clarity + GA4

- `ConsentManagerBridge` class
- Waits for `window.__cmp` or `cmp_addCallback`
- Checks consent from: CMP API, consent cookies, localStorage
- Decodes consent strings
- `handleConsentData()` — dispatches events to enable/disable:
  - Microsoft Clarity (`smib1d4kq5`)
  - Google Analytics 4 (`G-2FG8XLMM35`)
- Cookie scanning for `euconsent-v2`, `consentmanager`, `cmp-data`
- Polls for consent changes every 1 second

---

### `js/location-services.js` (300 lines)
**Purpose:** Google Maps distance calculations

- `LocationServices` class
- Hardcoded landmarks for 6 German cities: Berlin, Munich, Hamburg, Cologne, Frankfurt, Stuttgart (5 landmarks each)
- `calculateDistances(apartmentAddress, city)` — transit distances to all landmarks
- `calculateDistance()` — Google DirectionsService (TRANSIT mode)
- `calculateWalkingDistance()`, `calculateDrivingDistance()`
- `createDistanceWidget(apartmentAddress, city)` — generates HTML widget
- `displayDistances()` — renders landmark distances
- `initializeMap(containerId, location)` — creates styled Google Map with apartment marker
- Exported as `window.LocationServices`

---

## PWA Files

---

### `manifest.json` (143 lines)
- **Name:** "SichrPlace - Verified Student Apartments"
- **Display:** standalone, portrait-primary
- **Colors:** theme `#2563EB`, background `#2563EB`
- **Categories:** lifestyle, travel, education
- **Icons:** 14 entries (SVG, PNG from 72x72 to 512x512)
- **Shortcuts:** defined (details truncated in read)

### `service-worker.js` (416 lines)
- Cache names: `sichrplace-v1.0.0` (static + dynamic)
- **Static cache:** 12 HTML pages + manifest + images + JS + fonts + Font Awesome CDN
- **Caching strategies:**
  - API calls (`/api/`): Network-first with cache fallback (returns offline JSON on failure)
  - Static assets (img/css/js): Cache-first with network fallback
  - HTML pages: Stale-while-revalidate
- **Install:** precaches static files, `skipWaiting()`
- **Activate:** cleans old caches, `clients.claim()`
- **Push notifications:** handler defined (details in remaining lines)

---

## API Endpoint Master List

| Category | Endpoint | Method | Used In |
|----------|----------|--------|---------|
| **Auth** | `/auth/login` | POST | login.html |
| | `/api/register` | POST | create-account.html |
| | `/api/auth/forgot-password` | POST | forgot-password.html |
| | `/api/auth/verify-reset-token` | POST | reset-password.html |
| | `/api/auth/reset-password` | POST | reset-password.html |
| | `/api/auth/verify-email` | POST | verify-email.html |
| | `/api/auth/resend-verification` | POST | verify-email.html |
| | `/api/auth/change-email` | POST | verify-email.html |
| | `/api/auth/verify` | GET | viewing-requests-dashboard.html |
| **Apartments** | `/api/apartments` | GET | apartments-listing.html, viewing-requests-dashboard.html |
| | `/api/search/advanced` | GET | advanced-search.html |
| | `/api/search/popular` | GET | advanced-search.html |
| | `/api/search/save-alert` | POST | advanced-search.html |
| | `/api/favorites` | GET/POST | apartments-listing.html |
| | `/api/recently-viewed` | POST | apartments-listing.html |
| | `/api/booking-request` | POST | offer.html |
| **Viewing Requests** | `/api/viewing-requests` | POST | viewing-requests-dashboard.html |
| | `/api/viewing-requests/my-requests` | GET | viewing-requests-dashboard.html |
| | `/api/viewing-requests/my-properties` | GET | viewing-requests-dashboard.html |
| | `/api/viewing-requests/{id}/approve` | PATCH | viewing-requests-dashboard.html |
| | `/api/viewing-requests/{id}/reject` | PATCH | viewing-requests-dashboard.html |
| | `/api/viewing-requests/{id}/complete` | PATCH | viewing-requests-dashboard.html |
| | `/api/viewing-requests/{id}` | DELETE | viewing-requests-dashboard.html |
| | `/api/create-viewing-order` | POST | viewing-request.html |
| | `/api/capture-viewing-order/{id}` | POST | viewing-request.html |
| **Payments** | `/api/paypal/config` | GET | paypal-integration.js |
| | `/api/paypal/create` | POST | paypal-integration.js |
| | `/api/paypal/execute` | POST | paypal-integration.js |
| | `/api/paypal/marketplace/capture` | POST | paypal-integration.js, marketplace.html |
| | `/api/viewing-request` | POST | paypal-integration.js |
| **Maps** | `/api/maps/place-types` | GET | property-map.html |
| | `/api/maps/search-by-location` | POST | property-map.html |
| | `/api/maps/reverse-geocode` | POST | property-map.html |
| | `/api/maps/nearby-apartments` | POST | property-map.html |
| | `/api/maps/nearby-places` | POST | property-map.html |
| **Email** | `/api/emails/send-request-confirmation` | POST | viewing-request.html |
| **Profile** | `/api/update-profile` | POST | applicant-dashboard.html |
| **GDPR** | `/api/gdpr/consent` | GET/POST | privacy-settings.html, cookie-consent.js |
| | `/api/gdpr/export` | GET | privacy-settings.html |
| | `/api/gdpr/account` | DELETE | privacy-settings.html |
| | `/api/gdpr/request` | POST | privacy-settings.html |
| | `/api/gdpr/requests` | GET | privacy-settings.html |
| **Admin** | `/api/admin/login-check` | GET | admin-dashboard.html |
| | `/api/admin/dashboard` | GET | admin-dashboard.html |
| | `/api/admin/users` | GET | admin-dashboard.html |
| | `/api/admin/users/{u}/verify` | POST | admin-dashboard.html |
| | `/api/admin/users/{u}/suspend` | POST | admin-dashboard.html |
| | `/api/admin/users/{u}/deactivate` | POST | admin-dashboard.html |
| | `/api/admin/offers` | GET | admin-dashboard.html |
| | `/api/admin/offers/{id}/highlight` | POST | admin-dashboard.html |
| | `/api/admin/offers/{id}/deactivate` | POST | admin-dashboard.html |
| | `/api/admin/offers/{id}/activate` | POST | admin-dashboard.html |
| | `/api/admin/upload-queue` | GET | admin-dashboard.html |
| | `/api/admin/video-links` | GET | admin-dashboard.html |
| | `/api/admin/account-reps` | GET | admin-dashboard.html |
| | `/api/admin/messages` | GET | admin-dashboard.html |
| | `/api/admin/messages/{idx}/resolve` | POST | admin-dashboard.html |
| | `/api/admin/advanced-gdpr/compliance/dashboard` | GET | advanced-gdpr-dashboard.html |

---

## External Integrations

| Service | Configuration | Used In |
|---------|--------------|---------|
| **PayPal** | Client-ID: `AcPYlXozR8VS...` (LIVE), EUR, de_DE | index, viewing-request, marketplace, landlord-dashboard, paypal-integration.js |
| **Stripe** | Stripe.js CDN | landlord-dashboard.html |
| **Supabase** | Client CDN for real-time | chat.html, realtime-chat.js |
| **Google Maps** | Geocoding, Places, Geometry, Directions | offer.html, property-map.html, location-services.js |
| **Google Analytics 4** | `G-2FG8XLMM35` | marketplace, chat, google-analytics-config.js |
| **Microsoft Clarity** | `smib1d4kq5` | marketplace, chat, consent-manager-bridge.js |
| **Facebook Pixel** | Placeholder ID | index.html |
| **consentmanager.net** | Autoblocking script | marketplace.html |
| **Google Forms** | Form submission (no-cors) | viewing-request.html |
| **Google Fonts** | Poppins + Roboto | All main pages |
| **Font Awesome 6** | CDN | All pages |
| **Bootstrap 5** | CDN (grid only) | property-map.html |
| **TailwindCSS** | CDN v2.2.19 | forgot-password, reset-password, verify-email |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| HTML pages analyzed | 22 |
| JS modules analyzed | 8 |
| Unique API endpoints | ~55 |
| External service integrations | 13 |
| User roles | 4 (public, tenant, landlord, admin) |
| Payment methods | 2 (PayPal, Stripe) |
| Languages supported | 2 (EN, DE) |
| GDPR-related pages | 3 (privacy-policy, privacy-settings, advanced-gdpr-dashboard) |
