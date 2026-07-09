# Developer Journal & Build Log - Workly

This journal records key architectural decisions, resolved bugs, known quirks, and daily progress logs for the Workly platform.

---

## 1. Key Engineering Decisions

### A. Postgres Fuzzy Search via `pg_trgm` (College Searching)
*   **Decision:** Use the PostgreSQL `pg_trgm` extension for searching the 50,000+ official Indian colleges instead of setting up a heavyweight Elasticsearch instance.
*   **Rationale:** Simpler deployment and lower RAM costs. By running `similarity(name, $1) > 0.1` and adding a GIST index on the name, we get sub-10ms response times for fuzzy matching right inside SQL.
*   **Prisma Workaround:** Prisma client does not natively support similarity rank queries. We bypassed this by utilizing `prisma.$queryRawUnsafe` with fallback to basic ILIKE search when the extension is missing (e.g., in some local SQLite or dev databases).

### B. Redis WebSockets Pub/Sub Adapter (Real-Time Chats)
*   **Decision:** Bind Socket.io to a Redis Pub/Sub adapter.
*   **Rationale:** WebSockets keep long-running TCP sockets open. If we scale to multiple instances of our backend behind a load balancer, Socket A and Socket B might be connected to separate servers. Redis acts as the message bus that broadcasts chat events globally across all instances, ensuring messages get delivered instantly.

### C. Semantic Cache Layer (Gemini API Costs)
*   **Decision:** Build a vector-based semantic cache for the Q&A Academic Assistant.
*   **Rationale:** College students often ask identical questions (e.g. "What is time complexity of quicksort?"). Sending all these requests to Google Gemini increases latency and costs. When a question is asked:
    1. We convert it to a vector embedding.
    2. Search the `SemanticCache` table in PostgreSQL.
    3. If similarity is above 0.90, we return the cached string.
    4. Otherwise, we fetch from Gemini and insert it into the cache.

### D. DPDP Act Anonymization Pipeline (Legal Compliance)
*   **Decision:** Support absolute deletion using a database-level transaction that anonymizes user records rather than deleting rows.
*   **Rationale:** Foreign keys make cascade deletion tricky. Instead, we rewrite User profiles to `"Anonymous Student"` and update post/comment strings to generic text placeholders (e.g. `"[Deleted by user under DPDP Act]"`). All PII (emails, phone numbers, avatars, credentials) is completely wiped from the database.

---

## 2. Tricky Bugs & Workarounds

### A. The Windows Metro Bundler Path Escape Bug (`%5C`)
*   **Issue:** On Windows, running `npm run mobile:web` fails with a Metro bundler crash due to backslash paths being urlencoded as `%5C` instead of `/`.
*   **Workaround:** Bypassed by developing/testing on physical mobile devices using Expo Go.
*   **Command:** `npx expo start -c` (the `-c` flag is crucial to clear old path caches).
*   **Connectivity Tip:** Ensure the mobile device and development PC are connected to the exact same Wi-Fi network. Configure backend API strings in mobile to the PC's local IP address (e.g. `http://192.168.1.15:5000/api`) instead of `localhost`.

### B. Prisma schema relation fields on cascade deletions
*   **Issue:** Deleting a user row was blocked due to active chat messages (`ChatMessage` relations).
*   **Workaround:** Configured `@relation(onDelete: Cascade)` on `ChatMessage` fields, and wrapped cleanup processes inside a transaction (`prisma.$transaction`) to erase messages before anonymizing the profile.

---

## 3. Daily Log

### 2026-07-06: Project Alignment & Documentation Setup
*   **Accomplished:** Initial audit of the workspace monorepo.
*   **Created Files:**
    1. `PRD.md`: Outlines MVP scope, student user stories, and Indian context definition.
    2. `ARCHITECTURE.md`: Detail server directories, Prisma schema relations, and WebSocket flows.
    3. `API_CONTRACTS.md`: Explains payload contracts, HTTP verbs, and headers.
    4. `DESIGN_SYSTEM.md`: Outlines colors, NativeWind tailwind config, and typography.
    5. `ROADMAP.md`: Highlights finished items and plans BullMQ/S3 integration next.
*   **Updated Files:**
    1. `README.md` refreshed to represent Workly branding.
