# Product Requirements Document (PRD) - Workly

## 1. Product Overview & Core Problem

### The Core Problem
College life for undergraduate students in India is highly fragmented. Students rely on multiple disjointed tools (WhatsApp groups, Telegram channels for PYQs/notes, LinkedIn for project partner hunting, local notice boards, and unverified forums) to navigate their academic, professional, and social lives. Key issues include:
*   **Unverified Communities:** High risk of spam, outsiders, and lack of trust in campus-specific discussions.
*   **Inefficient Study Material Sharing:** Accessing previous year questions (PYQs) and high-quality notes is a chore, and student creators have no way to monetize their hard work.
*   **Inadequate Peer Matchmaking:** Finding teammates for hackathons, engineering capstones, or projects with complementary skills is restricted to narrow social circles.
*   **Lack of Target Context in AI Tools:** Students using general-purpose AI models receive answers that lack local Indian academic context (e.g. syllabus definitions, NPTEL references, college-specific details).

### Solution: Workly
Workly is a secure, cross-platform social, academic, and professional hub designed specifically for college students in India. By verifying users through college domains or official government-registered ID cards (linked to AISHE data), Workly provides an exclusive, trustworthy environment where students can share feeds, trade academic materials in a safe marketplace, find project partners using skill-matching, query an AI academic assistant, and chat in real-time.

---

## 2. Target Audience
*   **Primary:** College students in India aged 17–24 pursuing technical, social sciences, management, or medical undergraduate streams.
*   **Secondary:** Student developers, hackathon organizers, and academic content creators.

---

## 3. User Stories & Core Flows

```
[User Signs Up] ──> [Domain/ID Card Verify] ──> [Enter Dashboard] 
                                                        │
         ┌──────────────────┬───────────────────┼───────────────────┐
         ▼                  ▼                   ▼                   ▼
   [Campus Feed]     [Notes Market]       [Matchmaking]      [Academic AI Q&A]
   Participate in    Buy/Sell notes with  Create tickets &   Ask questions;
   Spaces/Channels   wallet balance       match on skills    get summaries
```

### Flow 1: Signup & Verification
*   *As a student*, I want to register for Workly using my email, phone, and college selection so that I can access my campus network.
*   *As a verified student*, I want my account automatically verified if my signup email uses my college domain, OR I want to upload my college ID card for automated OCR processing so I don't have to wait for manual admin review.

### Flow 2: Campus Feeds & Category Spaces
*   *As a student*, I want to browse my college's category channels (e.g. `#general`, `#notes`, `#pyqs`, `#placements`, `#fests`) and post text or media so I can stay updated on campus happenings.
*   *As a student*, I want post/comment content automatically moderated so that harassment or bad language is instantly flagged and blocked.

### Flow 3: Notes Marketplace
*   *As a student creator*, I want to upload PDFs or images of my lecture notes, set a price, and get paid when other students purchase them.
*   *As a buyer*, I want to filter documents by subject code, branch, and semester, view an AI-generated summary, and purchase access directly using my in-app wallet balance.

### Flow 4: Project Matchmaking (Matchmaker)
*   *As a student team leader*, I want to create a matchmaking ticket stating my project description, required skills, and the role I am looking for (e.g., "Frontend Developer").
*   *As a job/teammate seeker*, I want to see a scored list of open tickets sorted by skill compatibility so that I can join projects that suit my abilities.

### Flow 5: Real-time Communication
*   *As a student*, I want to search for peers on campus and initiate a secure, real-time private message chat to coordinate projects or class activities.

### Flow 6: Data Privacy & DPDP Compliance
*   *As a user in India*, I want control over my personal data, with options to update my consent settings, download a copy of all my data, or scrub/anonymize my profile per the Digital Personal Data Protection (DPDP) Act.

---

## 4. Feature Scope: MVP vs. V2

| Feature Area | MVP (Currently Implemented) | V2 (Planned Expansion) |
| :--- | :--- | :--- |
| **Authentication** | Email & Phone OTP login. JWT token-based session handling. | OAuth integrations (Google, Apple) & biometric login (FaceID/Fingerprint). |
| **Verification** | College domain matching. OCR ID card verification pipeline. Official AISHE college registry query. | India Stack / DigiLocker API integration for instant official verification. |
| **Academic Notes** | Upload documents, upvote/flag notes, view AI summary. Wallet checkout system with 10% platform fee. | Video lectures streaming, notes annotation, and preview pages for paid documents. |
| **Community** | Campus feed, posts with tags/media, likes, comments, and predefined category spaces. | User-created custom sub-spaces, campus poll creators, and event calendars. |
| **Matchmaking** | Skill-overlap matchmaking tickets. Basic open-roles search. | In-app group creation, automatic invitation emails, and integrated GitHub sync. |
| **AI Features** | Gemini Q&A with Semantic Redis Cache. Document summary queue. | Multi-document AI study guides, flashcard generator, and mock tests. |
| **DPDP Compliance** | Consent settings, downloadable data export, and full account erasure (PII anonymization). | Age verification controls & localized data residency indicators. |
| **Monetization** | Simulated wallet balance deposits. Premium account toggle (₹99/mo for ad-free experience). | Razorpay API integration, automated invoice generation, and monthly payouts to bank accounts. |
| **Targeted Ads** | Ads targeted based on branch, semester, and college location (Premium users see no ads). | Self-service ad manager for student clubs and local campus businesses. |
