# Product Roadmap - Workly

This document details the development milestones and release cycles for Workly.

---

## Milestone 1: Core Authentication & Security (Completed)
Setup the base platform structures to ensure only verified college students in India can access the system.
- [x] Initial monorepo configuration with npm workspaces (`apps/server`, `apps/mobile`).
- [x] Integrate Prisma ORM with PostgreSQL database connection.
- [x] User sign-up, login, and token-based JWT authentication middleware.
- [x] Create simulated OTP phone registration workflow.
- [x] Implement dual verification modes:
  - **Auto verification:** email domain validation matching the college's official domain name.
  - **ID card upload:** image upload compressed using `sharp` to `.webp` format and queued for background OCR detection.
- [x] Fuzzy search of government AISHE college registry list using Postgres `pg_trgm` indexes.

---

## Milestone 2: Campus Social & Chat Engine (Completed)
Build student interaction systems to create community vibes and peer-to-peer engagement.
- [x] Setup global feed where users can write posts, attach image files, and tag hashtags.
- [x] Implement sub-spaces channels scoped to a specific college (e.g. `#notes`, `#placements`, `#fests`).
- [x] Build comments and likes systems for feed interactions.
- [x] Integrate real-time chat utilizing Socket.io.
- [x] Implement Socket.io scaling via Redis Pub/Sub adapter to sync sockets across server instances.
- [x] Integrate automated local text moderation rules checking for profanity in posts and private chats.

---

## Milestone 3: Academic Marketplace & AI Assistant (Completed)
Introduce product value additions that make Workly an indispensable tool for student success.
- [x] Add study material notes sharing. Upload files (PDF/images) cataloged by subject code, branch, and semester.
- [x] Create digital in-app wallet balance system supporting virtual top-ups.
- [x] Implement document buying and selling transactions (deducts from buyer, credits seller, applies a 10% platform fee).
- [x] Build AI academic helper query routes using the Google Gemini API.
- [x] Design a semantic caching mechanism to check vector query similarities to save on LLM API costs.
- [x] Run async document summaries using Gemini to extract a 5-bullet summary on notes upload.

---

## Milestone 4: Operations, Privacy & Monitoring (In Progress)
Prepare the code base for production scale and full legal compliance.
- [x] Integrate **Sentry** SDK on mobile for error capturing and performance telemetry.
- [x] Integrate **PostHog** on mobile to track navigation screen views.
- [/] Enforce **DPDP Act 2023** compliance guidelines:
  - Consents manager (toggle profiling, marketing, geolocation).
  - Anonymization routine: scrub all PII (phone number, email, real name, documents) when a user triggers account deletion.
  - Portable data exporter: dump all user data (posts, chats, purchases) in raw JSON.
- [ ] Migrate in-memory local OCR queues to **BullMQ** backed by Redis.
- [ ] Implement AWS S3 file storage uploads replacing temporary server local folders.

---

## Milestone 5: Future Scale & V2 Features (Planned)
Expand the product value to match growing student networks.
- [ ] Group hackathon team builder dashboards.
- [ ] NPTEL and exam schedule calendar calendar API integrations.
- [ ] Student creator dashboard with monthly payouts to bank accounts via Razorpay API.
- [ ] Video lectures streaming with sub-title indexing.
