# SichrPlace — North Star Architecture & Implementation Guide

> **Version:** 1.0.0 | **Date:** 2026-02-17 | **Status:** Living Document  
> **Purpose:** Comprehensive reference for rebuilding the SichrPlace platform with a Java/Spring Boot backend while maintaining full design integrity with the existing frontend.

---

## Table of Contents

1. [Project Vision & Overview](#1-project-vision--overview)
2. [System Architecture](#2-system-architecture)
3. [Database Schema (Supabase → JPA)](#3-database-schema-supabase--jpa)
4. [Entity Relationship Diagrams](#4-entity-relationship-diagrams)
5. [API Contract Reference](#5-api-contract-reference)
6. [Authentication & Security](#6-authentication--security)
7. [Frontend Page Inventory & Design System](#7-frontend-page-inventory--design-system)
8. [Business Logic Rules](#8-business-logic-rules)
9. [User Role Matrix](#9-user-role-matrix)
10. [Feature Parity Checklist](#10-feature-parity-checklist)
11. [Java Backend Implementation Map](#11-java-backend-implementation-map)
12. [Integration Points](#12-integration-points)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Data Flow Diagrams](#14-data-flow-diagrams)
15. [Testing Strategy](#15-testing-strategy)

---

## 1. Project Vision & Overview

**SichrPlace** is a secure apartment rental platform connecting landlords and tenants in **Germany**. It targets students, young professionals, and AIESEC participants seeking verified, safe housing.

### Core Value Proposition
- **Verified Listings** — All apartments are reviewed before publication
- **Secure Messaging** — Real-time encrypted chat between parties
- **Integrated Payments** — PayPal-powered viewing fees, booking deposits, and marketplace purchases
- **GDPR Compliance** — Full European data protection with consent management
- **German Market Focus** — SCHUFA credit checks, German rental conventions (Kaltmiete/Warmmiete), multilingual (EN/DE/TR)

### Technology Stack

| Layer | Reference (Existing) | Target (New) |
|-------|---------------------|--------------|
| **Frontend** | Vanilla HTML/CSS/JS + Tailwind | **Preserved as-is** |
| **Backend API** | Node.js/Express + Netlify Functions | **Java 21 / Spring Boot 3.2** |
| **Database** | Supabase (PostgreSQL) | **MS SQL Server** (JPA/Hibernate) |
| **Auth** | JWT (jsonwebtoken) | **Spring Security + JJWT** |
| **Payments** | PayPal REST API v2 | **PayPal REST API v2 (Java SDK)** |
| **Email** | Nodemailer (Gmail SMTP) | **Spring Mail (Gmail SMTP)** |
| **File Storage** | Supabase Storage | **Local/Azure Blob Storage** |
| **Hosting** | Netlify (FE) + Railway (BE) | **Azure / Self-hosted** |

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Static)                        │
│  Vanilla HTML/CSS/JS  •  Poppins/Roboto  •  Font Awesome 6     │
│  PayPal SDK  •  Google Maps SDK  •  Supabase Realtime (chat)   │
│  PWA (Service Worker)  •  i18n (EN/DE/TR)  •  GDPR Consent     │
├─────────────────────────────────────────────────────────────────┤
│                      ↕ REST API (JSON)                          │
├─────────────────────────────────────────────────────────────────┤
│                    JAVA BACKEND (Spring Boot)                   │
│  Controllers  •  Services  •  Repositories  •  Security        │
│  JWT Auth  •  Rate Limiting  •  Input Validation  •  CORS      │
│  PayPal Integration  •  Email Service  •  File Upload          │
├─────────────────────────────────────────────────────────────────┤
│                      ↕ JPA/Hibernate                            │
├─────────────────────────────────────────────────────────────────┤
│                       DATABASE (MS SQL)                         │
│  Users  •  Apartments  •  ViewingRequests  •  Conversations     │
│  Messages  •  Payments  •  Reviews  •  Notifications  •  GDPR  │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
Browser → GET/POST /api/* → Spring Security Filter Chain
  → JwtAuthenticationFilter (extract + validate JWT)
  → SecurityContext (set authenticated user)
  → Controller (@RestController)
  → Service (business logic + validation)
  → Repository (JPA/Hibernate)
  → MS SQL Server
  → Response DTO → JSON → Browser
```

---

## 3. Database Schema (Supabase → JPA)

### 3.1 Core Entities

#### `users` — Platform Users

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID (PK) | auto-generated | Primary identifier |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | Login identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Contact & login |
| `password` | VARCHAR(255) | NOT NULL | BCrypt hashed |
| `role` | VARCHAR(20) | CHECK | `ADMIN`, `LANDLORD`, `TENANT` |
| `first_name` | VARCHAR(100) | nullable | |
| `last_name` | VARCHAR(100) | nullable | |
| `phone` | VARCHAR(20) | nullable | |
| `date_of_birth` | DATE | nullable | |
| `bio` | TEXT | nullable | |
| `profile_image_url` | TEXT | nullable | |
| `city` | VARCHAR(100) | nullable | German city |
| `country` | VARCHAR(100) | DEFAULT 'Germany' | |
| `email_verified` | BOOLEAN | DEFAULT false | |
| `verification_token_hash` | VARCHAR(255) | nullable | SHA-256 hash |
| `verified_at` | TIMESTAMP | nullable | |
| `reset_password_token` | VARCHAR(255) | nullable | |
| `reset_password_expires` | TIMESTAMP | nullable | |
| `account_status` | VARCHAR(20) | DEFAULT 'active' | `active`, `suspended`, `pending_verification`, `deactivated` |
| `suspension_reason` | TEXT | nullable | |
| `is_active` | BOOLEAN | DEFAULT true | |
| `two_factor_enabled` | BOOLEAN | DEFAULT false | |
| `verification_level` | VARCHAR(20) | DEFAULT 'basic' | `basic`, `verified`, `premium` |
| `gdpr_consent` | BOOLEAN | DEFAULT false | |
| `gdpr_consent_date` | TIMESTAMP | nullable | |
| `data_processing_consent` | BOOLEAN | DEFAULT false | |
| `marketing_consent` | BOOLEAN | DEFAULT false | |
| `preferences` | TEXT (JSON) | nullable | User preferences JSON |
| `notification_settings` | TEXT (JSON) | nullable | |
| `profile_completion_score` | INT | 0–100 | |
| `last_login_at` | TIMESTAMP | nullable | |
| `last_active_at` | TIMESTAMP | DEFAULT NOW() | |
| `failed_login_attempts` | INT | DEFAULT 0 | |
| `last_failed_login` | TIMESTAMP | nullable | |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |

**Indexes:** `email` (unique), `username` (unique), `role`, `verification_token_hash`, `created_at`

---

#### `apartments` — Property Listings

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID (PK) | auto-generated | |
| `owner_id` | UUID (FK→users) | ON DELETE CASCADE | |
| `title` | VARCHAR(255) | NOT NULL | |
| `description` | TEXT | NOT NULL | |
| `city` | VARCHAR(100) | | German city |
| `district` | VARCHAR(100) | | Stadtteil |
| `address` | TEXT | | Full address |
| `postal_code` | VARCHAR(20) | | 5-digit German |
| `state` | VARCHAR(100) | | Bundesland |
| `country` | VARCHAR(100) | DEFAULT 'Germany' | |
| `latitude` | DECIMAL(10,8) | nullable | |
| `longitude` | DECIMAL(11,8) | nullable | |
| `monthly_rent` | DECIMAL(10,2) | NOT NULL | Kaltmiete (cold rent) |
| `deposit_amount` | DECIMAL(10,2) | nullable | Kaution |
| `utilities_warm` | DECIMAL(10,2) | nullable | Nebenkosten warm |
| `utilities_cold` | DECIMAL(10,2) | nullable | Nebenkosten kalt |
| `size_sqm` | INT | NOT NULL | Square meters |
| `rooms` | INT | NOT NULL | Number of rooms (Zimmer) |
| `bedrooms` | INT | nullable | |
| `bathrooms` | INT | DEFAULT 1 | |
| `furnished` | BOOLEAN | DEFAULT false | Möbliert |
| `pet_friendly` | BOOLEAN | DEFAULT false | Haustiere erlaubt |
| `smoking_allowed` | BOOLEAN | DEFAULT false | |
| `has_balcony` | BOOLEAN | DEFAULT false | |
| `has_parking` | BOOLEAN | DEFAULT false | Stellplatz |
| `has_elevator` | BOOLEAN | DEFAULT false | |
| `has_garden` | BOOLEAN | DEFAULT false | |
| `washing_machine` | BOOLEAN | DEFAULT false | |
| `dishwasher` | BOOLEAN | DEFAULT false | |
| `internet_included` | BOOLEAN | DEFAULT false | |
| `amenities` | TEXT | nullable | Comma-separated or JSON |
| `heating_type` | VARCHAR(50) | nullable | |
| `energy_rating` | VARCHAR(10) | nullable | Energieeffizienzklasse |
| `images` | TEXT | nullable | JSON array of URLs |
| `video_tour_url` | TEXT | nullable | |
| `virtual_tour_url` | TEXT | nullable | |
| `floor_plan_url` | TEXT | nullable | |
| `available_from` | DATE | nullable | Verfügbar ab |
| `available_until` | DATE | nullable | |
| `minimum_lease_months` | INT | nullable | |
| `maximum_lease_months` | INT | nullable | |
| `house_rules` | TEXT | nullable | JSON array |
| `nearby_amenities` | TEXT | nullable | JSON array |
| `public_transport_info` | TEXT | nullable | |
| `status` | VARCHAR(20) | DEFAULT 'AVAILABLE' | `AVAILABLE`, `RENTED`, `ARCHIVED`, `PENDING` |
| `featured` | BOOLEAN | DEFAULT false | |
| `verification_status` | VARCHAR(20) | DEFAULT 'PENDING' | `PENDING`, `VERIFIED`, `REJECTED` |
| `verification_notes` | TEXT | nullable | |
| `number_of_views` | INT | DEFAULT 0 | |
| `average_rating` | DECIMAL(3,2) | DEFAULT 0.0 | |
| `review_count` | INT | DEFAULT 0 | |
| `admin_notes` | TEXT | nullable | |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |

**Indexes:** `owner_id`, `status`, `city`, `district`, `postal_code`, `monthly_rent`, `featured`, `created_at DESC`, `verification_status`

---

#### `viewing_requests` — Apartment Viewing Appointments

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID (PK) | auto-generated | |
| `apartment_id` | UUID (FK→apartments) | ON DELETE CASCADE | |
| `tenant_id` | UUID (FK→users) | ON DELETE CASCADE | Requester |
| `landlord_id` | UUID (FK→users) | ON DELETE CASCADE | Auto-resolved from apartment owner |
| `proposed_date_time` | TIMESTAMP | NOT NULL | Preferred date 1 |
| `alternative_date_1` | TIMESTAMP | nullable | |
| `alternative_date_2` | TIMESTAMP | nullable | |
| `confirmed_date_time` | TIMESTAMP | nullable | Set on confirmation |
| `message` | TEXT | nullable | Tenant's message |
| `contact_phone` | VARCHAR(20) | nullable | |
| `contact_email` | VARCHAR(255) | nullable | |
| `number_of_people` | INT | DEFAULT 1 | |
| `special_requirements` | TEXT | nullable | |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' | `PENDING`, `CONFIRMED`, `DECLINED`, `COMPLETED`, `CANCELLED` |
| `decline_reason` | TEXT | nullable | |
| `cancellation_reason` | TEXT | nullable | |
| `cancelled_by` | UUID (FK→users) | nullable | |
| `cancelled_at` | TIMESTAMP | nullable | |
| `responded_at` | TIMESTAMP | nullable | |
| `completion_notes` | TEXT | nullable | |
| `completion_rating` | INT | 1–5 nullable | |
| `payment_required` | BOOLEAN | DEFAULT true | |
| `payment_status` | VARCHAR(20) | DEFAULT 'PENDING' | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `booking_fee` | DECIMAL(10,2) | DEFAULT 25.00 | |
| `created_at` | TIMESTAMP | auto | |
| `updated_at` | TIMESTAMP | auto | |

**Indexes:** `tenant_id`, `apartment_id`, `landlord_id`, `status`, `created_at DESC`

---

### 3.2 Communication Entities

#### `conversations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `apartment_id` | UUID (FK→apartments) | nullable, ON DELETE CASCADE |
| `participant_1_id` | UUID (FK→users) | ON DELETE CASCADE |
| `participant_2_id` | UUID (FK→users) | ON DELETE CASCADE |
| `last_message_at` | TIMESTAMP | DEFAULT NOW() |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

**Unique constraint:** `(apartment_id, participant_1_id, participant_2_id)`

#### `messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `conversation_id` | UUID (FK→conversations) | ON DELETE CASCADE |
| `sender_id` | UUID (FK→users) | ON DELETE CASCADE |
| `content` | TEXT | NOT NULL, max 5000 chars |
| `message_type` | VARCHAR(20) | DEFAULT 'text' — `text`, `image`, `file`, `system` |
| `read_by_recipient` | BOOLEAN | DEFAULT false |
| `read_at` | TIMESTAMP | nullable |
| `file_url` | TEXT | nullable |
| `file_name` | TEXT | nullable |
| `file_size` | INT | nullable (bytes) |
| `is_deleted` | BOOLEAN | DEFAULT false |
| `edited_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | auto |

---

### 3.3 Payment Entities

#### `payment_transactions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `payment_id` | VARCHAR(255) | UNIQUE, NOT NULL — PayPal payment ID |
| `payer_id` | VARCHAR(255) | nullable — PayPal payer ID |
| `user_id` | UUID (FK→users) | ON DELETE SET NULL |
| `viewing_request_id` | UUID (FK→viewing_requests) | nullable |
| `apartment_id` | UUID (FK→apartments) | nullable |
| `amount` | DECIMAL(10,2) | NOT NULL |
| `currency` | VARCHAR(3) | DEFAULT 'EUR' |
| `payment_method` | VARCHAR(50) | DEFAULT 'paypal' |
| `status` | VARCHAR(20) | `pending`, `created`, `approved`, `completed`, `cancelled`, `failed`, `refunded` |
| `gateway_status` | VARCHAR(50) | Raw PayPal status |
| `transaction_id` | VARCHAR(255) | Gateway transaction ID |
| `gateway_response` | TEXT (JSON) | Full PayPal response |
| `fees` | DECIMAL(10,2) | nullable |
| `net_amount` | DECIMAL(10,2) | nullable |
| `completed_at` | TIMESTAMP | nullable |
| `refunded_at` | TIMESTAMP | nullable |
| `refund_amount` | DECIMAL(10,2) | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

#### `refund_requests`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `request_number` | VARCHAR(20) | UNIQUE, NOT NULL |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `payment_transaction_id` | UUID (FK→payment_transactions) | ON DELETE CASCADE |
| `viewing_request_id` | UUID (FK→viewing_requests) | nullable |
| `amount` | DECIMAL(10,2) | NOT NULL |
| `reason` | VARCHAR(100) | NOT NULL |
| `description` | TEXT | nullable |
| `status` | VARCHAR(20) | `pending`, `approved`, `denied`, `processed`, `cancelled` |
| `processed_by` | UUID (FK→users) | nullable |
| `processed_at` | TIMESTAMP | nullable |
| `admin_notes` | TEXT | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 3.4 User Experience Entities

#### `user_favorites`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `apartment_id` | UUID (FK→apartments) | ON DELETE CASCADE |
| `created_at` | TIMESTAMP | auto |

**Unique constraint:** `(user_id, apartment_id)`

#### `apartment_reviews`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `apartment_id` | UUID (FK→apartments) | ON DELETE CASCADE |
| `reviewer_id` | UUID (FK→users) | ON DELETE CASCADE |
| `viewing_request_id` | UUID (FK→viewing_requests) | nullable |
| `rating` | INT | NOT NULL, 1–5 |
| `title` | VARCHAR(255) | 3–100 chars |
| `comment` | TEXT | 10–2000 chars |
| `pros` | TEXT | nullable |
| `cons` | TEXT | nullable |
| `would_recommend` | BOOLEAN | nullable |
| `landlord_rating` | INT | nullable, 1–5 |
| `location_rating` | INT | nullable, 1–5 |
| `value_rating` | INT | nullable, 1–5 |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' — `PENDING`, `APPROVED`, `REJECTED` |
| `moderated_by` | UUID (FK→users) | nullable |
| `moderated_at` | TIMESTAMP | nullable |
| `moderation_notes` | TEXT | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

**Unique constraint:** `(apartment_id, reviewer_id)` — one review per user per apartment

#### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `type` | VARCHAR(50) | NOT NULL — 17 notification types |
| `title` | VARCHAR(255) | NOT NULL |
| `message` | TEXT | nullable |
| `related_entity_type` | VARCHAR(50) | nullable |
| `related_entity_id` | UUID | nullable |
| `read_at` | TIMESTAMP | nullable |
| `action_url` | TEXT | nullable |
| `priority` | VARCHAR(20) | DEFAULT 'normal' — `low`, `normal`, `high`, `urgent` |
| `created_at` | TIMESTAMP | auto |
| `expires_at` | TIMESTAMP | nullable |

#### `saved_searches`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `name` | VARCHAR(255) | NOT NULL |
| `search_criteria` | TEXT (JSON) | NOT NULL |
| `alerts_enabled` | BOOLEAN | DEFAULT true |
| `alert_frequency` | VARCHAR(20) | `immediate`, `daily`, `weekly` |
| `last_alert_sent` | TIMESTAMP | nullable |
| `is_active` | BOOLEAN | DEFAULT true |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

#### `recently_viewed`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `apartment_id` | UUID (FK→apartments) | ON DELETE CASCADE |
| `viewed_at` | TIMESTAMP | DEFAULT NOW() |

**Unique constraint:** `(user_id, apartment_id)` — upsert pattern

---

### 3.5 Admin & Support Entities

#### `support_tickets`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `ticket_number` | VARCHAR(20) | UNIQUE, NOT NULL |
| `user_id` | UUID (FK→users) | ON DELETE SET NULL |
| `category` | VARCHAR(50) | NOT NULL — technical, billing, general, complaint |
| `priority` | VARCHAR(20) | DEFAULT 'medium' — low, medium, high, urgent |
| `status` | VARCHAR(20) | DEFAULT 'open' — open, in_progress, pending_user, resolved, closed |
| `subject` | VARCHAR(500) | NOT NULL |
| `description` | TEXT | NOT NULL |
| `assigned_to` | UUID (FK→users) | nullable |
| `resolved_at` | TIMESTAMP | nullable |
| `satisfaction_rating` | INT | nullable, 1–5 |
| `internal_notes` | TEXT | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

#### `safety_reports`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `reporter_id` | UUID (FK→users) | ON DELETE SET NULL |
| `reported_user_id` | UUID (FK→users) | nullable |
| `reported_apartment_id` | UUID (FK→apartments) | nullable |
| `category` | VARCHAR(50) | NOT NULL |
| `severity` | VARCHAR(20) | DEFAULT 'medium' |
| `status` | VARCHAR(20) | DEFAULT 'pending' |
| `description` | TEXT | NOT NULL |
| `evidence_urls` | TEXT | nullable (JSON array) |
| `action_taken` | VARCHAR(100) | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 3.6 GDPR & Compliance Entities

#### `gdpr_tracking_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | nullable |
| `session_id` | VARCHAR(255) | nullable |
| `event` | VARCHAR(50) | NOT NULL — `consent_given`, `consent_withdrawn`, `user_data_deleted`, etc. |
| `service` | VARCHAR(50) | DEFAULT 'microsoft_clarity' |
| `data` | TEXT (JSON) | nullable |
| `ip_address` | VARCHAR(45) | nullable |
| `user_agent` | TEXT | nullable |
| `consent_version` | VARCHAR(10) | DEFAULT '1.0' |
| `legal_basis` | VARCHAR(50) | nullable |
| `retention_date` | TIMESTAMP | DEFAULT NOW() + 3 years |
| `created_at` | TIMESTAMP | auto |

#### `consent_audit_log`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `consent_type` | VARCHAR(50) | NOT NULL |
| `consent_given` | BOOLEAN | NOT NULL |
| `consent_version` | VARCHAR(10) | DEFAULT '1.0' |
| `ip_address` | VARCHAR(45) | nullable |
| `withdrawal_reason` | TEXT | nullable |
| `created_at` | TIMESTAMP | auto |

---

### 3.7 Analytics & Tracking Entities

#### `apartment_analytics`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `apartment_id` | UUID (FK→apartments) | ON DELETE CASCADE |
| `date` | DATE | DEFAULT CURRENT_DATE |
| `views_count` | INT | DEFAULT 0 |
| `favorites_count` | INT | DEFAULT 0 |
| `viewing_requests_count` | INT | DEFAULT 0 |
| `contact_attempts_count` | INT | DEFAULT 0 |
| `search_appearances_count` | INT | DEFAULT 0 |

**Unique constraint:** `(apartment_id, date)`

#### `email_logs`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `recipient_email` | VARCHAR(255) | NOT NULL |
| `email_type` | VARCHAR(50) | NOT NULL |
| `subject` | VARCHAR(500) | nullable |
| `status` | VARCHAR(20) | DEFAULT 'pending' — pending, sent, failed, delivered, bounced |
| `user_id` | UUID (FK→users) | nullable |
| `error_message` | TEXT | nullable |
| `sent_at` | TIMESTAMP | DEFAULT NOW() |
| `delivered_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | auto |

#### `user_feedback`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | nullable |
| `message` | TEXT | NOT NULL |
| `email` | VARCHAR(255) | nullable |
| `category` | VARCHAR(50) | DEFAULT 'general' — general, bug, feature_request, complaint, compliment |
| `severity` | VARCHAR(20) | DEFAULT 'medium' — low, medium, high, critical |
| `status` | VARCHAR(20) | DEFAULT 'new' — new, in_progress, resolved, closed |
| `admin_notes` | TEXT | nullable |
| `resolved_by` | UUID (FK→users) | nullable |
| `resolved_at` | TIMESTAMP | nullable |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

### 3.8 Tenant Screening

#### `schufa_checks`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `user_id` | UUID (FK→users) | ON DELETE CASCADE |
| `apartment_id` | UUID (FK→apartments) | nullable |
| `first_name` | VARCHAR(100) | NOT NULL |
| `last_name` | VARCHAR(100) | NOT NULL |
| `date_of_birth` | DATE | NOT NULL |
| `address` | TEXT | NOT NULL |
| `postal_code` | VARCHAR(5) | NOT NULL |
| `city` | VARCHAR(100) | NOT NULL |
| `credit_score` | INT | nullable, 650–900 |
| `risk_category` | VARCHAR(20) | nullable — VERY_LOW, LOW, MEDIUM, HIGH |
| `approved` | BOOLEAN | nullable |
| `status` | VARCHAR(20) | DEFAULT 'pending' — pending, processing, completed, failed |
| `valid_until` | DATE | nullable — 90 days from completion |
| `score_factors` | TEXT (JSON) | nullable |
| `consent_given` | BOOLEAN | NOT NULL |
| `created_at` | TIMESTAMP | auto |
| `completed_at` | TIMESTAMP | nullable |

---

### 3.9 Marketplace Entities

#### `marketplace_listings`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID (PK) | auto-generated |
| `seller_id` | UUID (FK→users) | ON DELETE CASCADE |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | nullable |
| `price` | DECIMAL(10,2) | NOT NULL |
| `category` | VARCHAR(50) | NOT NULL |
| `condition` | VARCHAR(20) | nullable — new, like_new, good, fair |
| `images` | TEXT | nullable (JSON array) |
| `status` | VARCHAR(20) | DEFAULT 'active' |
| `created_at` | TIMESTAMP | auto |
| `updated_at` | TIMESTAMP | auto |

---

## 4. Entity Relationship Diagrams

### 4.1 Core Domain ERD

```
                    ┌──────────────────┐
                    │      USERS       │
                    │──────────────────│
                    │ id (PK, UUID)    │
                    │ username (UQ)    │
                    │ email (UQ)       │
                    │ password (hash)  │
                    │ role             │
                    │ ...              │
                    └──────┬───────────┘
                           │
          ┌────────────────┼────────────────────────────┐
          │                │                            │
          │ owner_id       │ tenant_id / landlord_id    │ participant_id
          ▼                ▼                            ▼
┌──────────────────┐ ┌──────────────────┐  ┌──────────────────┐
│   APARTMENTS     │ │ VIEWING_REQUESTS │  │  CONVERSATIONS   │
│──────────────────│ │──────────────────│  │──────────────────│
│ id (PK)          │ │ id (PK)          │  │ id (PK)          │
│ owner_id (FK)    │ │ apartment_id(FK) │  │ apartment_id(FK) │
│ title            │ │ tenant_id (FK)   │  │ participant_1(FK)│
│ monthly_rent     │ │ landlord_id (FK) │  │ participant_2(FK)│
│ city / district  │ │ proposed_date    │  │ last_message_at  │
│ status           │ │ status           │  └────────┬─────────┘
│ ...              │ │ booking_fee      │           │
└────────┬─────────┘ │ payment_status   │           │
         │           └──────────────────┘           │
         │                                          ▼
         │                               ┌──────────────────┐
         │                               │    MESSAGES       │
         │                               │──────────────────│
         │                               │ id (PK)          │
         │                               │ conversation_id  │
         │                               │ sender_id (FK)   │
         │                               │ content          │
         │                               │ message_type     │
         │                               │ read_at          │
         │                               └──────────────────┘
         │
         ├──────────────────┬────────────────────┐
         ▼                  ▼                    ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────────┐
│ USER_FAVORITES │ │ APT_REVIEWS    │ │ APT_ANALYTICS      │
│────────────────│ │────────────────│ │────────────────────│
│ user_id (FK)   │ │ apartment_id   │ │ apartment_id (FK)  │
│ apartment_id   │ │ reviewer_id    │ │ date               │
│                │ │ rating (1-5)   │ │ views_count        │
└────────────────┘ │ status         │ │ favorites_count    │
                   └────────────────┘ └────────────────────┘
```

### 4.2 Payment Flow ERD

```
USERS ──┐
        ├──▶ PAYMENT_TRANSACTIONS ──▶ REFUND_REQUESTS
        │         │
VIEWING_│         │ viewing_request_id
REQUESTS┘         │ apartment_id
                  │
                  ▼
            (PayPal API)
```

---

## 5. API Contract Reference

### 5.1 Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Login, receive JWT |
| `GET` | `/api/auth/profile` | Bearer | Get current user profile |
| `PUT` | `/api/auth/profile` | Bearer | Update current user profile |
| `GET` | `/api/auth/users/{id}` | Public | Get user by ID |

#### Register Request
```json
{
  "username": "string (3-50 chars, alphanumeric + _-)",
  "email": "string (valid email)",
  "password": "string (6-128 chars)",
  "role": "TENANT | LANDLORD",
  "firstName": "string?",
  "lastName": "string?",
  "phone": "string?"
}
```

#### Register Response
```json
{
  "user": { "id", "username", "email", "role", "firstName", "lastName" },
  "accessToken": "JWT (24h expiry)",
  "refreshToken": "JWT (7d expiry)",
  "redirectUrl": "/landlord-dashboard.html | /applicant-dashboard.html"
}
```

#### Login Request
```json
{
  "emailOrUsername": "string (auto-detect via @ character)",
  "password": "string",
  "remember": "boolean? (extends token to 30d)"
}
```

#### Login Response
```json
{
  "accessToken": "JWT",
  "refreshToken": "JWT",
  "user": { "id", "username", "email", "role", "firstName", "lastName", "emailVerified" }
}
```

---

### 5.2 Apartment Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/apartments` | LANDLORD/ADMIN | Create listing |
| `GET` | `/api/apartments` | Public | Search with filters (paginated) |
| `GET` | `/api/apartments/{id}` | Public | Get by ID |
| `GET` | `/api/apartments/owner/listings` | LANDLORD/ADMIN | Get own listings |
| `PUT` | `/api/apartments/{id}` | LANDLORD/ADMIN | Update (ownership verified) |
| `DELETE` | `/api/apartments/{id}` | LANDLORD/ADMIN | Delete (ownership verified) |

#### Search Query Parameters
| Param | Type | Description |
|-------|------|-------------|
| `city` | string | Filter by city |
| `district` | string | Filter by Stadtteil |
| `postal_code` | string | 5-digit German postal code |
| `minPrice` / `maxPrice` | decimal | Kaltmiete range |
| `minRooms` / `maxRooms` | int | Room count range (Zimmer) |
| `minSize` / `maxSize` | int | Size in m² |
| `bedrooms` | int | Min bedrooms |
| `bathrooms` | int | Min bathrooms |
| `furnished` | boolean | Möbliert filter |
| `petFriendly` | boolean | Haustiere erlaubt |
| `parking` | boolean | Stellplatz |
| `availableFrom` | date | Verfügbar ab |
| `page` | int | Page number (default: 0) |
| `size` | int | Page size (default: 12, max: 50) |
| `sortBy` | string | `price`, `createdAt`, `rooms`, `size` |
| `sortOrder` | string | `asc`, `desc` |

#### Create Apartment Request
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "city": "string (required)",
  "district": "string?",
  "address": "string?",
  "postalCode": "string?",
  "monthlyRent": "decimal (required)",
  "depositAmount": "decimal?",
  "sizeSquareMeters": "int (required)",
  "numberOfBedrooms": "int (required)",
  "numberOfBathrooms": "int? (default: 1)",
  "rooms": "int (required)",
  "furnished": "boolean? (default: false)",
  "petFriendly": "boolean? (default: false)",
  "hasParking": "boolean?",
  "hasBalcony": "boolean?",
  "hasElevator": "boolean?",
  "amenities": "string? (comma-separated)",
  "availableFrom": "date?",
  "images": "string[]?"
}
```

---

### 5.3 Viewing Request Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/viewing-requests` | TENANT | Create viewing request |
| `GET` | `/api/viewing-requests/{id}` | Bearer | Get by ID (auth check) |
| `GET` | `/api/viewing-requests/my` | TENANT | My viewing requests |
| `GET` | `/api/viewing-requests/my/paged` | TENANT | My requests (paged, filterable) |
| `GET` | `/api/viewing-requests/apartment/{id}` | LANDLORD/ADMIN | Requests for apartment |
| `GET` | `/api/viewing-requests/apartment/{id}/paged` | LANDLORD/ADMIN | Paged version |
| `PUT` | `/api/viewing-requests/{id}/confirm` | LANDLORD/ADMIN | Confirm with date |
| `PUT` | `/api/viewing-requests/{id}/decline` | LANDLORD/ADMIN | Decline with reason |
| `PUT` | `/api/viewing-requests/{id}/cancel` | TENANT | Cancel own request |

#### Create Viewing Request
```json
{
  "apartmentId": "UUID (required)",
  "proposedDateTime": "ISO datetime (required)",
  "alternativeDate1": "ISO datetime?",
  "alternativeDate2": "ISO datetime?",
  "message": "string?",
  "contactPhone": "string?",
  "numberOfPeople": "int? (default: 1)"
}
```

#### Status Flow
```
PENDING ──▶ CONFIRMED ──▶ COMPLETED
   │              │
   ├──▶ DECLINED  ├──▶ CANCELLED
   │
   └──▶ CANCELLED
```

---

### 5.4 Messaging Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/conversations` | Bearer | List conversations |
| `POST` | `/api/conversations` | Bearer | Create conversation |
| `GET` | `/api/conversations/{id}/messages` | Bearer | Get messages |
| `POST` | `/api/conversations/{id}/messages` | Bearer | Send message |
| `PUT` | `/api/conversations/{id}/read` | Bearer | Mark as read |

---

### 5.5 Favorites Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/favorites` | Bearer | List user's favorites |
| `POST` | `/api/favorites` | Bearer | Toggle favorite (add/remove) |
| `DELETE` | `/api/favorites/{apartmentId}` | Bearer | Remove favorite |

---

### 5.6 Review Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/reviews/apartment/{id}` | Public | Get reviews with stats |
| `POST` | `/api/reviews` | Bearer | Submit review (1 per user per apt) |
| `PUT` | `/api/reviews/{id}` | Bearer | Update own review |
| `DELETE` | `/api/reviews/{id}` | Bearer/ADMIN | Delete review |

---

### 5.7 Notification Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/notifications` | Bearer | List notifications (paginated) |
| `PUT` | `/api/notifications/{id}/read` | Bearer | Mark as read |
| `PUT` | `/api/notifications/read-all` | Bearer | Mark all as read |
| `DELETE` | `/api/notifications/{id}` | Bearer | Delete notification |

---

### 5.8 Payment Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/payments/config` | Public | Get PayPal client config |
| `POST` | `/api/payments/create` | Bearer | Create PayPal order |
| `POST` | `/api/payments/capture` | Bearer | Capture PayPal payment |
| `POST` | `/api/payments/webhooks` | PayPal Sig | Handle webhook events |

---

### 5.9 Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/dashboard` | ADMIN | Dashboard statistics |
| `GET` | `/api/admin/users` | ADMIN | Paginated user list |
| `PUT` | `/api/admin/users/{id}/role` | ADMIN | Update user role |
| `PUT` | `/api/admin/users/{id}/status` | ADMIN | Block/suspend user |
| `DELETE` | `/api/admin/apartments/{id}` | ADMIN | Delete apartment (cascade) |
| `DELETE` | `/api/admin/users/{id}` | ADMIN | Delete user (cascade) |

---

### 5.10 GDPR Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/gdpr/export` | Bearer | Export all user data (Art. 20) |
| `DELETE` | `/api/gdpr/delete` | Bearer | Delete account (Art. 17) |
| `GET` | `/api/gdpr/consent-status` | Bearer | Get all consent records |
| `PUT` | `/api/gdpr/consent` | Bearer | Update consent record |

---

### 5.11 Other Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/feedback` | Optional | Submit user feedback |
| `GET` | `/api/health` | Public | Health check (DB + cache) |
| `GET` | `/api/search` | Public | Advanced apartment search |
| `POST` | `/api/tenant-screening/schufa` | Bearer | Request SCHUFA check |
| `GET` | `/api/tenant-screening/schufa/{id}` | Bearer | Get SCHUFA result |
| `POST` | `/api/email/send` | Bearer | Send transactional email |
| `GET` | `/api/maps/config` | Public | Google Maps API config |

---

## 6. Authentication & Security

### 6.1 JWT Configuration

| Parameter | Value |
|-----------|-------|
| **Algorithm** | HS256 (HMAC-SHA256) |
| **Access Token Expiry** | 24 hours (86,400,000ms) |
| **Refresh Token Expiry** | 7 days (604,800,000ms) |
| **Extended Expiry** | 30 days (with `remember` flag) |
| **Token Payload** | `{ sub: userId, email, role, iat, exp }` |
| **Password Hash** | BCrypt (12 rounds) |
| **Secret Source** | `jwt.secret` in `application.yml` |

### 6.2 Security Configuration

```
Public Endpoints (no auth required):
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/users/**
  GET  /api/apartments/**
  GET  /api/reviews/**
  GET  /api/health
  GET  /api/search
  GET  /api/maps/config
  GET  /api/payments/config
  GET  /swagger-ui/** , /v3/api-docs/**

Protected Endpoints (Bearer token required):
  All other /api/** endpoints

Role-Restricted Endpoints:
  LANDLORD/ADMIN: POST/PUT/DELETE /api/apartments, confirm/decline viewing requests
  TENANT:         POST viewing requests, cancel viewing requests
  ADMIN:          /api/admin/**, review moderation, user management
```

### 6.3 CORS Configuration

| Environment | Allowed Origins |
|-------------|-----------------|
| Development | `localhost:3000`, `localhost:8080`, `127.0.0.1:5500` |
| Production | `https://sichrplace.com`, `https://www.sichrplace.com` |

### 6.4 Rate Limiting

| Configuration | Value |
|---------------|-------|
| Window | 15 minutes |
| Max Requests | 100 per window |
| Login Attempts | 5 per identifier, 15-min lockout |

### 6.5 Input Validation

- All string fields: max length enforced, XSS sanitized
- Email: format validation
- Password: 6–128 chars minimum
- Username: 3–50 chars, alphanumeric + `_` + `-`
- German postal codes: exactly 5 digits
- UUIDs: RFC4122 format validated

---

## 7. Frontend Page Inventory & Design System

### 7.1 Design Tokens

```css
:root {
  --primary:       #2563EB;     /* Blue 600 */
  --primary-dark:  #1d4ed8;     /* Blue 700 */
  --secondary:     #F9FAFB;     /* Gray 50 */
  --accent:        #40E0D0;     /* Turquoise */
  --text:          #222;        /* Near-black */
  --muted:         #6b7280;     /* Gray 500 */
  --card:          #fff;        /* White */
  --danger:        #EF4444;     /* Red 500 */
  --success:       #10b981;     /* Emerald 500 */
  --radius:        18px;        /* Border radius */
  --shadow:        0 2px 12px rgba(0,0,0,0.06);
  --heading-font:  "Poppins", sans-serif;
  --body-font:     "Roboto", sans-serif;
}
```

### 7.2 External Dependencies (CDN)

| Resource | CDN |
|----------|-----|
| Poppins + Roboto | Google Fonts |
| Font Awesome 6.5 | cdnjs |
| Tailwind CSS 2.x | cdn.jsdelivr.net (some pages) |
| PayPal SDK | paypal.com/sdk/js |
| Google Maps | maps.googleapis.com |
| Supabase JS | unpkg.com (chat only) |

### 7.3 Complete Page Inventory

| Page | File | Purpose | Auth Required | Role |
|------|------|---------|---------------|------|
| **Landing** | `index.html` | Hero, features, CTA | No | All |
| **Login** | `login.html` | Sign in | No | All |
| **Register** | `create-account.html` | Sign up (Tenant/Landlord) | No | All |
| **Forgot Password** | `forgot-password.html` | Password reset request | No | All |
| **Reset Password** | `reset-password.html` | Set new password | Token | All |
| **Verify Email** | `verify-email.html` | Email verification | Token | All |
| **Apartments** | `apartments-listing.html` | Browse/search listings | No | All |
| **Advanced Search** | `advanced-search.html` | Detailed apartment search | No | All |
| **Offer Detail** | `offer.html` | Single apartment detail | No | All |
| **Viewing Request** | `viewing-request.html` | Book a viewing | Yes | Tenant |
| **Viewing Dashboard** | `viewing-requests-dashboard.html` | Manage viewings | Yes | All |
| **Applicant Dashboard** | `applicant-dashboard.html` | Tenant hub | Yes | Tenant |
| **Landlord Dashboard** | `landlord-dashboard.html` | Landlord hub | Yes | Landlord |
| **Admin Dashboard** | `admin-dashboard.html` | Platform admin | Yes | Admin |
| **Add Property** | `add-property.html` | Create listing | Yes | Landlord |
| **Chat** | `chat.html` | Real-time messaging | Yes | All |
| **Marketplace** | `marketplace.html` | Buy/sell furniture | Yes | All |
| **PayPal Checkout** | `paypal-checkout.html` | Payment page | Yes | All |
| **Tenant Screening** | `tenant-screening-schufa.html` | SCHUFA credit check | Yes | Landlord |
| **About** | `about.html` | Company info | No | All |
| **FAQ** | `faq.html` | Help / FAQ | No | All |
| **Privacy Policy** | `privacy-policy.html` | GDPR policy | No | All |
| **Terms of Service** | `terms-of-service.html` | Legal terms | No | All |
| **Reviews** | `reviews-template.html` | Review display | No | All |
| **Analytics** | `analytics-dashboard.html` | Performance metrics | Yes | Admin |
| **Customer Service** | `customer-service.html` | Support portal | Yes | All |

### 7.4 Frontend JavaScript Modules

| Module | Purpose |
|--------|---------|
| `config.js` | Central config (API URLs, feature flags, PayPal, Maps) |
| `bulletproof-registration.js` | Resilient user registration with retries |
| `bulletproof-paypal-integration.js` | PayPal payments (viewing/booking/marketplace) |
| `smart-matching.js` | Tenant-apartment matching preferences |
| `reviews.js` | Review submission and display system |
| `location-services.js` | Google Maps integration |
| `language-switcher.js` | Simple i18n switcher |
| `translation-handler.js` | Advanced i18n with caching (EN/DE/TR) |
| `feedback-widget.js` | Floating feedback submission widget |
| `availability-monitor.js` | Backend health monitoring |
| `pwa-init.js` | Service worker, push notifications, install prompt |
| `logo-cookie-manager.js` | Logo/branding management |
| `translations.json` | Translation dictionary (EN/DE/TR) |

---

## 8. Business Logic Rules

### 8.1 User Registration
- Username: 3–50 chars, `[a-zA-Z0-9_-]`
- Email: valid format, unique
- Password: 6–128 chars, hashed with BCrypt (12 rounds)
- Verification email sent with SHA-256 hashed token (24h expiry)
- GDPR consent flags set at registration
- Role-based redirect: Landlord → `/landlord-dashboard.html`, Tenant → `/applicant-dashboard.html`

### 8.2 Login
- Accept email OR username (auto-detect via `@` character)
- Rate limit: 5 failed attempts → 15-minute lockout
- Reject blocked/suspended/deactivated accounts
- Update `last_login_at` on success
- JWT expiry: 24h standard, 30d with "remember me"

### 8.3 Apartment Listings
- Only LANDLORD/ADMIN can create/edit/delete
- Ownership verified on update/delete operations
- Status lifecycle: `PENDING` → `AVAILABLE` → `RENTED`/`ARCHIVED`
- German rental pricing: Kaltmiete (base) + Nebenkosten = Warmmiete
- `total_rent` = `monthly_rent` + `utilities_warm` + `utilities_cold`
- Search defaults to `status = AVAILABLE` only
- Pagination: default 12/page, max 50

### 8.4 Viewing Requests
- Tenants cannot request viewings for their own apartments
- One active request per apartment per tenant (pending/confirmed)
- Status flow: `PENDING` → `CONFIRMED`/`DECLINED` → `COMPLETED`/`CANCELLED`
- Landlords must provide `confirmedDateTime` when confirming
- Landlords must provide `declineReason` when declining
- Cancellation tracks WHO cancelled and WHY
- If `payment_status = PAID` on cancellation, auto-set to `REFUNDED`
- Default booking fee: €25.00

### 8.5 Reviews
- One review per user per apartment (unique constraint)
- Landlords cannot review their own apartments
- All new reviews start as `PENDING` (moderation required)
- Public users see only `APPROVED` reviews
- Authenticated users see approved + their own (any status)
- Content updates reset status back to `PENDING` (re-moderation)
- Rating: 1–5 stars, with sub-ratings (landlord, location, value)

### 8.6 Messaging
- Direct conversations: exactly 2 participants, deduplicated
- Messages: max 5,000 chars, supports text/image/file/system types
- 24-hour edit window for sent messages
- Soft delete pattern (mark `is_deleted`, don't remove)
- Auto-update `conversation.last_message_at` on new message
- Unread count calculated per participant

### 8.7 Payments (PayPal)
- Three payment types: Viewing Fee, Booking Fee, Marketplace Purchase
- Viewing fee: fixed amount from business rules (default €25)
- Booking fee: percentage of rent (with min/max caps)
- Marketplace: item price + platform commission
- Payment statuses: `pending` → `created` → `approved` → `completed`
- Webhook events: `PAYMENT.CAPTURE.COMPLETED`, `DENIED`, `REFUNDED`
- Transaction upsert pattern (create if new, update if exists)

### 8.8 SCHUFA Tenant Screening
- German SCHUFA credit scoring (simulated in dev)
- 90-day validity: reuse completed check if within 90 days
- Score range: 650–900
- Risk categories: VERY_LOW (≥800), LOW (≥700), MEDIUM (≥600), HIGH (<600)
- Approval threshold: score ≥ 600
- Requires explicit GDPR consent

### 8.9 GDPR Compliance
- **Art. 17 (Right to Erasure):** Anonymize user data (not hard delete) for referential integrity. Block if future confirmed bookings exist. Requires confirmation string `"DELETE MY ACCOUNT PERMANENTLY"`.
- **Art. 20 (Data Portability):** Export all user data as JSON download.
- **Consent Management:** Track consent type, version, given/withdrawn status.
- **Retention:** 3-year default retention period. Data anonymized, not deleted.

---

## 9. User Role Matrix

### Role Definitions

| Role | Code | Description |
|------|------|-------------|
| **Tenant (Applicant)** | `TENANT` | Apartment seekers, students, professionals |
| **Landlord** | `LANDLORD` | Property owners listing apartments |
| **Admin** | `ADMIN` | Platform administrators |

### Permission Matrix

| Action | Tenant | Landlord | Admin |
|--------|--------|----------|-------|
| Register/Login | ✅ | ✅ | ✅ |
| Browse apartments | ✅ | ✅ | ✅ |
| Search apartments | ✅ | ✅ | ✅ |
| View apartment detail | ✅ | ✅ | ✅ |
| Create apartment listing | ❌ | ✅ | ✅ |
| Edit own listing | ❌ | ✅ | ✅ |
| Delete own listing | ❌ | ✅ | ✅ |
| Create viewing request | ✅ | ❌ | ❌ |
| Cancel own viewing | ✅ | ❌ | ❌ |
| Confirm/Decline viewings | ❌ | ✅ | ✅ |
| Send messages | ✅ | ✅ | ✅ |
| Add to favorites | ✅ | ✅ | ✅ |
| Write reviews | ✅ | ❌ (own) | ✅ |
| Moderate reviews | ❌ | ❌ | ✅ |
| Make payments | ✅ | ✅ | ✅ |
| View own dashboard | ✅ | ✅ | ✅ |
| Admin dashboard | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Request SCHUFA check | ❌ | ✅ | ✅ |
| Export personal data | ✅ | ✅ | ✅ |
| Delete account | ✅ | ✅ | ✅ |

---

## 10. Feature Parity Checklist

### Phase 1: Core Foundation (Must Have)

| # | Feature | Supabase Reference | Java Status |
|---|---------|-------------------|-------------|
| 1 | User Registration | `auth-register.mjs` | ✅ Built |
| 2 | User Login | `auth-login.mjs` | ✅ Built |
| 3 | JWT Authentication | `utils/auth` | ✅ Built |
| 4 | Apartment CRUD | `apartments.mjs` | ✅ Built |
| 5 | Apartment Search (basic) | `apartments.mjs` | ✅ Built |
| 6 | Viewing Request CRUD | `viewing-requests.mjs` | ✅ Built |
| 7 | Health Check | `health.mjs` | ✅ Built |
| 8 | CORS + Security | server.js | ✅ Built |
| 9 | Swagger/OpenAPI Docs | swagger.json | ✅ Built |
| 10 | Global Error Handling | errorHandler | ✅ Built |

### Phase 2: User Experience (Should Have)

| # | Feature | Supabase Reference | Java Status |
|---|---------|-------------------|-------------|
| 11 | Favorites (toggle) | `favorites.mjs` | ❌ TODO |
| 12 | Reviews + Moderation | `reviews.mjs` | ❌ TODO |
| 13 | Notifications | `notifications.mjs` | ❌ TODO |
| 14 | Saved Searches | `saved-searches` | ❌ TODO |
| 15 | Recently Viewed | `recently-viewed` | ❌ TODO |
| 16 | User Profile Update | `user-profile.mjs` | ❌ TODO |
| 17 | Advanced Search | `search.mjs` | ❌ TODO |
| 18 | Conversations + Messages | `conversations.mjs`, `messages.mjs` | ❌ TODO |

### Phase 3: Payments & Compliance (Should Have)

| # | Feature | Supabase Reference | Java Status |
|---|---------|-------------------|-------------|
| 19 | PayPal Integration | `paypal-payments.mjs` | ❌ TODO |
| 20 | Booking Requests | `booking-requests.mjs` | ❌ TODO |
| 21 | GDPR Data Export | `gdpr-compliance.mjs` | ❌ TODO |
| 22 | GDPR Account Deletion | `gdpr-compliance.mjs` | ❌ TODO |
| 23 | Consent Management | `gdpr-compliance.mjs` | ❌ TODO |
| 24 | Email Service | `email-service.mjs` | ❌ TODO |
| 25 | Refund Requests | (admin flow) | ❌ TODO |

### Phase 4: Admin & Analytics (Nice to Have)

| # | Feature | Supabase Reference | Java Status |
|---|---------|-------------------|-------------|
| 26 | Admin Dashboard API | `admin.mjs` | ❌ TODO |
| 27 | User Management (Admin) | `admin.mjs` | ❌ TODO |
| 28 | SCHUFA Tenant Screening | `tenant-screening-schufa.mjs` | ❌ TODO |
| 29 | Feedback Widget Backend | `feedback` | ❌ TODO |
| 30 | Apartment Analytics | analytics edge fn | ❌ TODO |
| 31 | Support Tickets | (schema only) | ❌ TODO |
| 32 | Safety Reports | (schema only) | ❌ TODO |

### Phase 5: Advanced Features (Future)

| # | Feature | Supabase Reference | Java Status |
|---|---------|-------------------|-------------|
| 33 | Smart Matching | `/api/matching/*` | ❌ TODO |
| 34 | Marketplace | marketplace routes | ❌ TODO |
| 35 | Push Notifications (VAPID) | pwa-init.js | ❌ TODO |
| 36 | File Upload (images) | `file-upload.mjs` | ❌ TODO |
| 37 | Google Maps Integration | maps routes | ❌ TODO |
| 38 | Real-time Chat (WebSocket) | Supabase realtime | ❌ TODO |
| 39 | Digital Contracts | (schema only) | ❌ TODO |

---

## 11. Java Backend Implementation Map

### 11.1 Package Structure

```
com.sichrplace.backend
├── SichrPlaceBackendApplication.java
├── config/
│   ├── SecurityConfig.java           ✅ Done
│   ├── OpenApiConfig.java            ✅ Done
│   ├── GlobalExceptionHandler.java   ✅ Done
│   ├── CorsConfig.java              (merge into SecurityConfig)
│   └── PayPalConfig.java            ❌ TODO
├── controller/
│   ├── UserController.java           ✅ Done (auth + profile)
│   ├── ApartmentController.java      ✅ Done (CRUD + search)
│   ├── ViewingRequestController.java ✅ Done (full lifecycle)
│   ├── FavoriteController.java       ❌ TODO
│   ├── ReviewController.java         ❌ TODO
│   ├── NotificationController.java   ❌ TODO
│   ├── ConversationController.java   ❌ TODO
│   ├── MessageController.java        ❌ TODO
│   ├── PaymentController.java        ❌ TODO
│   ├── AdminController.java          ❌ TODO
│   ├── GdprController.java           ❌ TODO
│   ├── FeedbackController.java       ❌ TODO
│   ├── SchuFaController.java         ❌ TODO
│   ├── SearchController.java         ❌ TODO
│   └── HealthController.java         ❌ TODO (separate from actuator)
├── dto/
│   ├── RegisterRequest.java          ✅ Done
│   ├── LoginRequest.java             ✅ Done
│   ├── UserDto.java                  ✅ Done
│   ├── UserAuthDto.java              ✅ Done (with tokens)
│   ├── ApartmentDto.java             ✅ Done
│   ├── CreateApartmentRequest.java   ✅ Done
│   ├── ViewingRequestDto.java        ✅ Done
│   ├── CreateViewingRequestRequest.java ✅ Done
│   ├── DeclineRequest.java           ✅ Done
│   ├── ApiErrorResponse.java         ✅ Done
│   ├── FavoriteDto.java              ❌ TODO
│   ├── ReviewDto.java                ❌ TODO
│   ├── CreateReviewRequest.java      ❌ TODO
│   ├── NotificationDto.java          ❌ TODO
│   ├── ConversationDto.java          ❌ TODO
│   ├── MessageDto.java               ❌ TODO
│   ├── PaymentDto.java               ❌ TODO
│   ├── FeedbackRequest.java          ❌ TODO
│   └── SchuFaResultDto.java          ❌ TODO
├── model/
│   ├── User.java                     ✅ Done
│   ├── Apartment.java                ✅ Done
│   ├── ViewingRequest.java           ✅ Done
│   ├── Conversation.java             ❌ TODO
│   ├── Message.java                  ❌ TODO
│   ├── UserFavorite.java             ❌ TODO
│   ├── ApartmentReview.java          ❌ TODO
│   ├── Notification.java             ❌ TODO
│   ├── PaymentTransaction.java       ❌ TODO
│   ├── RefundRequest.java            ❌ TODO
│   ├── SavedSearch.java              ❌ TODO
│   ├── RecentlyViewed.java           ❌ TODO
│   ├── SupportTicket.java            ❌ TODO
│   ├── SafetyReport.java             ❌ TODO
│   ├── EmailLog.java                 ❌ TODO
│   ├── UserFeedback.java             ❌ TODO
│   ├── GdprTrackingLog.java          ❌ TODO
│   ├── ConsentAuditLog.java          ❌ TODO
│   ├── ApartmentAnalytics.java       ❌ TODO
│   └── SchuFaCheck.java              ❌ TODO
├── repository/
│   ├── UserRepository.java           ✅ Done
│   ├── ApartmentRepository.java      ✅ Done
│   ├── ViewingRequestRepository.java ✅ Done
│   ├── (all other repositories)      ❌ TODO
├── security/
│   ├── JwtTokenProvider.java         ✅ Done
│   ├── JwtAuthenticationFilter.java  ✅ Done
│   └── (no additional needed)
├── service/
│   ├── UserService.java              ✅ Done (interface)
│   ├── UserServiceImpl.java          ✅ Done
│   ├── ApartmentService.java         ✅ Done (interface)
│   ├── ApartmentServiceImpl.java     ✅ Done
│   ├── ViewingRequestService.java    ✅ Done (interface)
│   ├── ViewingRequestServiceImpl.java ✅ Done
│   ├── FavoriteService.java          ❌ TODO
│   ├── ReviewService.java            ❌ TODO
│   ├── NotificationService.java      ❌ TODO
│   ├── ConversationService.java      ❌ TODO
│   ├── MessageService.java           ❌ TODO
│   ├── PayPalService.java            ❌ TODO
│   ├── EmailService.java             ❌ TODO
│   ├── AdminService.java             ❌ TODO
│   ├── GdprService.java              ❌ TODO
│   ├── FeedbackService.java          ❌ TODO
│   ├── SchuFaService.java            ❌ TODO
│   ├── SearchService.java            ❌ TODO
│   └── AnalyticsService.java         ❌ TODO
```

### 11.2 Spring Boot Dependencies (`build.gradle`)

```groovy
// Current (Done)
spring-boot-starter-web          // REST API
spring-boot-starter-data-jpa     // ORM
spring-boot-starter-security     // Auth
spring-boot-starter-validation   // Input validation
lombok                           // Boilerplate reduction
jjwt (0.12.3)                   // JWT tokens
springdoc-openapi (2.3.0)       // Swagger docs
mssql-jdbc                      // MS SQL Server

// Needed (TODO)
spring-boot-starter-mail         // Email sending
spring-boot-starter-websocket    // Real-time chat
spring-boot-starter-actuator     // Health/metrics
paypal-server-sdk                // PayPal integration (Java SDK)
```

---

## 12. Integration Points

### 12.1 Frontend → Backend API Mapping

The frontend makes API calls from JavaScript modules. Here's how they map to the Java backend:

| Frontend Module | API Call | Java Controller |
|----------------|----------|-----------------|
| `bulletproof-registration.js` | `POST /api/auth/register` | `UserController.register()` |
| Login page JS | `POST /api/auth/login` | `UserController.login()` |
| `config.js` | `getApiEndpoint()` | All controllers |
| Apartment listing JS | `GET /api/apartments` | `ApartmentController.search()` |
| `add-property.html` JS | `POST /api/apartments` | `ApartmentController.create()` |
| `viewing-request.html` JS | `POST /api/viewing-requests` | `ViewingRequestController.create()` |
| `reviews.js` | `GET/POST /api/reviews` | `ReviewController` (TODO) |
| `smart-matching.js` | `GET/POST /api/matching/*` | `MatchingController` (TODO) |
| `bulletproof-paypal-integration.js` | `POST /api/payments/*` | `PaymentController` (TODO) |
| `feedback-widget.js` | `POST /api/feedback` | `FeedbackController` (TODO) |
| `pwa-init.js` | `POST /api/push/*` | `PushController` (TODO) |
| `location-services.js` | `GET /api/maps/config` | `MapsController` (TODO) |
| `availability-monitor.js` | `HEAD /api/*` | All controllers |

### 12.2 External Service Integrations

| Service | Purpose | Config Key |
|---------|---------|------------|
| **PayPal REST API v2** | Payment processing | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| **Gmail SMTP** | Transactional emails | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| **Google Maps Platform** | Geocoding, distances | `GOOGLE_MAPS_API_KEY` |
| **SCHUFA API** | Credit checks (simulated) | N/A (simulated in dev) |
| **Microsoft Clarity** | UX analytics | Frontend-only |
| **Google Analytics 4** | Traffic analytics | Frontend-only |

### 12.3 Field Name Mapping (German ↔ English)

The frontend and legacy database use mixed German/English field names. The Java backend should use English internally, with mapping at the DTO layer:

| German (DB/Frontend) | English (Java) |
|----------------------|----------------|
| `kaltmiete` | `monthlyRent` |
| `warmmiete` | `totalRent` (calculated) |
| `nebenkosten_warm` | `utilitiesWarm` |
| `nebenkosten_kalt` | `utilitiesCold` |
| `kaution` | `depositAmount` |
| `zimmer` | `rooms` |
| `groesse` / `wohnflaeche` | `sizeSquareMeters` |
| `schlafzimmer` | `bedrooms` |
| `badezimmer` | `bathrooms` |
| `moebliert` | `furnished` |
| `haustiere` | `petFriendly` |
| `stellplatz` | `hasParking` |
| `aufzug` | `hasElevator` |
| `stadtteil` | `district` |
| `verfuegbar_ab` | `availableFrom` |
| `geburtsdatum` | `dateOfBirth` |
| `energieeffizienzklasse` | `energyRating` |
| `titel` | `title` |
| `beschreibung` | `description` |
| `bilder` | `images` |

---

## 13. Deployment Architecture

### Current Target Stack

```
┌─────────────────────────────────┐
│    Frontend (Static Files)       │
│    Served by Spring Boot         │
│    or separate Nginx             │
├─────────────────────────────────┤
│    Java 21 / Spring Boot 3.2    │
│    Embedded Tomcat               │
│    Port: 8080 (default)          │
├─────────────────────────────────┤
│    MS SQL Server 2019+           │
│    localhost:1433                 │
│    Database: sichrplace          │
│    User: sichrplace_user         │
└─────────────────────────────────┘
```

### Environment Variables

```yaml
# Database
spring.datasource.url: jdbc:sqlserver://localhost:1433;databaseName=sichrplace
spring.datasource.username: sichrplace_user
spring.datasource.password: <password>

# JWT
jwt.secret: <64+ char random string>
jwt.access-token-expiration: 86400000    # 24 hours
jwt.refresh-token-expiration: 604800000  # 7 days

# Email (Gmail SMTP)
spring.mail.host: smtp.gmail.com
spring.mail.port: 587
spring.mail.username: <gmail_address>
spring.mail.password: <app_password>

# PayPal
paypal.client-id: <client_id>
paypal.client-secret: <client_secret>
paypal.mode: sandbox  # or live

# Google Maps
google.maps.api-key: <api_key>

# Server
server.port: 8080
```

---

## 14. Data Flow Diagrams

### 14.1 User Registration Flow

```
Browser                    Spring Boot                  Database
  │                            │                            │
  ├─POST /api/auth/register──▶│                            │
  │  {username, email,         │                            │
  │   password, role}          │                            │
  │                            ├──Check email exists───────▶│
  │                            │◀──false───────────────────┤
  │                            │                            │
  │                            ├──BCrypt hash password     │
  │                            ├──Generate verification     │
  │                            │   token (SHA-256)          │
  │                            ├──INSERT INTO users────────▶│
  │                            │◀──User created────────────┤
  │                            │                            │
  │                            ├──Generate JWT tokens       │
  │                            ├──Send verification email   │
  │                            │   (async, non-blocking)    │
  │◀──201 {user, token,       │                            │
  │    redirectUrl}            │                            │
```

### 14.2 Apartment Search Flow

```
Browser                    Spring Boot                  Database
  │                            │                            │
  ├─GET /api/apartments?      │                            │
  │  city=Berlin&minPrice=500 │                            │
  │  &maxPrice=1500&page=0    │                            │
  │                            ├──Build JPA Specification──▶│
  │                            │   WHERE city = 'Berlin'    │
  │                            │   AND price >= 500         │
  │                            │   AND price <= 1500        │
  │                            │   AND status = 'AVAILABLE' │
  │                            │   ORDER BY created_at DESC │
  │                            │   OFFSET 0 LIMIT 12        │
  │                            │◀──Page<Apartment>─────────┤
  │                            │                            │
  │                            ├──Map to ApartmentDto[]     │
  │◀──200 {content: [...],   │                            │
  │    totalPages, totalElements,│                          │
  │    number, size}           │                            │
```

### 14.3 Viewing Request Flow

```
Tenant                     Spring Boot                  Database
  │                            │                            │
  ├─POST /api/viewing-requests│                            │
  │  {apartmentId, proposedDT,│                            │
  │   message}                 │                            │
  │                            ├──Validate JWT → tenantId   │
  │                            ├──GET apartment────────────▶│
  │                            │◀──apartment (owner_id)────┤
  │                            │                            │
  │                            ├──Check: tenant ≠ owner     │
  │                            ├──INSERT viewing_request───▶│
  │                            │   status = PENDING         │
  │                            │◀──created─────────────────┤
  │◀──201 ViewingRequestDto   │                            │

Landlord                   Spring Boot                  Database
  │                            │                            │
  ├─PUT /api/viewing-requests/│                            │
  │  {id}/confirm              │                            │
  │  {confirmedDateTime}       │                            │
  │                            ├──Validate JWT → landlordId │
  │                            ├──GET viewing_request──────▶│
  │                            │◀──request (status=PENDING)┤
  │                            ├──Check ownership           │
  │                            ├──UPDATE status=CONFIRMED──▶│
  │                            │◀──updated─────────────────┤
  │◀──200 ViewingRequestDto   │                            │
```

### 14.4 PayPal Payment Flow

```
Browser                    Spring Boot             PayPal API
  │                            │                       │
  ├─POST /api/payments/create │                       │
  │  {amount, apartmentId}     │                       │
  │                            ├──Create Order────────▶│
  │                            │◀──orderId, approveURL┤
  │                            ├──INSERT payment_txn──▶DB
  │◀──{orderId, approveURL}   │                       │
  │                            │                       │
  ├─(redirect to PayPal)──────┼──────────────────────▶│
  │◀─(PayPal approved)────────┼──────────────────────┤│
  │                            │                       │
  ├─POST /api/payments/capture│                       │
  │  {orderId}                 │                       │
  │                            ├──Capture Payment─────▶│
  │                            │◀──capture result──────┤
  │                            ├──UPDATE payment_txn──▶DB
  │◀──{success, transaction}  │                       │
```

---

## 15. Testing Strategy

### 15.1 Test Pyramid

```
        ╱╲
       ╱  ╲         E2E Tests (Selenium/Playwright)
      ╱    ╲        Frontend + Backend integration
     ╱──────╲
    ╱        ╲      Integration Tests
   ╱          ╲     Controller tests with @SpringBootTest
  ╱────────────╲
 ╱              ╲   Unit Tests
╱                ╲  Service + Repository + Security
╱──────────────────╲
```

### 15.2 Test Coverage Targets

| Layer | Coverage Target | Framework |
|-------|----------------|-----------|
| Service Layer | 90%+ | JUnit 5 + Mockito |
| Controller Layer | 85%+ | MockMvc + @WebMvcTest |
| Repository Layer | 80%+ | @DataJpaTest |
| Security Layer | 90%+ | Spring Security Test |
| Integration | 70%+ | @SpringBootTest |

### 15.3 Key Test Scenarios

**Authentication Tests:**
- Register with valid/invalid data
- Login with email vs username
- JWT token validation/expiry
- Rate limiting on login attempts
- Protected endpoint access without token
- Role-based access control

**Apartment Tests:**
- CRUD operations with ownership checks
- Search with all filter combinations
- Pagination and sorting
- Status lifecycle transitions

**Viewing Request Tests:**
- Create: tenant cannot book own apartment
- Confirm/Decline by landlord only
- Status transition validation (409 on invalid)
- Cancel with refund trigger

**Business Logic Tests:**
- German rental price calculations
- SCHUFA score evaluation
- GDPR data export/anonymization
- Review moderation workflow
- Favorite toggle behavior

---

## Appendices

### A. Notification Types (17)

| Type | Trigger |
|------|---------|
| `viewing_request` | New viewing request received |
| `viewing_approved` | Viewing request approved |
| `viewing_rejected` | Viewing request declined |
| `new_message` | New chat message |
| `favorite_apartment_updated` | Favorited apartment updated |
| `review_submitted` | New review on your apartment |
| `review_moderated` | Your review was moderated |
| `saved_search_alert` | New apartment matches saved search |
| `system_announcement` | Platform-wide announcement |
| `booking_confirmed` | Booking confirmed |
| `booking_cancelled` | Booking cancelled |
| `payment_success` | Payment completed |
| `payment_failed` | Payment failed |
| `apartment_approved` | Listing approved by admin |
| `apartment_rejected` | Listing rejected by admin |
| `gdpr_request_completed` | GDPR request processed |

### B. Email Templates (10)

| Template | Trigger |
|----------|---------|
| `welcome` | User registration |
| `email_verification` | After registration |
| `password_reset` | Forgot password |
| `booking_confirmation` | Viewing confirmed |
| `booking_reminder` | Day before viewing |
| `booking_cancelled` | Viewing cancelled |
| `landlord_inquiry` | New inquiry from tenant |
| `gdpr_data_export` | Data export ready |
| `gdpr_deletion_confirmation` | Account deleted |
| `newsletter` | Marketing (consent required) |

### C. German Rental Terminology

| German | English | Description |
|--------|---------|-------------|
| Kaltmiete | Cold Rent | Base rent without utilities |
| Warmmiete | Warm Rent | Rent including utilities |
| Nebenkosten | Additional Costs | Utility costs (water, heating, etc.) |
| Kaution | Deposit | Security deposit (typically 2-3 months) |
| Zimmer | Rooms | Total room count |
| Schlafzimmer | Bedrooms | Sleeping rooms only |
| Quadratmeter | Square Meters | Area measurement |
| Möbliert | Furnished | Includes furniture |
| Haustiere erlaubt | Pets Allowed | Pet-friendly policy |
| Stellplatz | Parking Space | Dedicated parking |
| Stadtteil | District | Neighborhood/borough |
| Energieeffizienzklasse | Energy Rating | A+ to H scale |
| Verfügbar ab | Available From | Move-in date |
| WG | Shared Apartment | Wohngemeinschaft |

### D. Configuration Reference

```yaml
# application.yml — All Profiles
spring:
  application:
    name: sichrplace-backend

# application-local.yml — Development
spring:
  datasource:
    url: jdbc:sqlserver://localhost:1433;databaseName=sichrplace
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
  mail:
    host: smtp.gmail.com
    port: 587
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true

jwt:
  secret: ${JWT_SECRET:your-secure-random-string-min-64-chars}
  access-token-expiration: 86400000
  refresh-token-expiration: 604800000

paypal:
  client-id: ${PAYPAL_CLIENT_ID}
  client-secret: ${PAYPAL_CLIENT_SECRET}
  mode: sandbox

google:
  maps:
    api-key: ${GOOGLE_MAPS_API_KEY}
```

---

> **Last Updated:** 2026-02-17  
> **Maintained By:** SichrPlace Engineering Team  
> **Status:** Phase 1 Complete (Core Foundation) • Phase 2-5 TODO
