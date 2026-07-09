# API Contracts - Workly

This document defines the REST API endpoints, expected request bodies, headers, and standard response payloads for the Workly backend. All endpoints are prefixed with `/api`.

---

## Global Headers & Rate Limiting

*   **Content-Type:** `application/json` (unless uploading files with `multipart/form-data`)
*   **Authorization:** `Bearer <JWT_TOKEN>` (for authenticated endpoints)
*   **Rate Limit:** 60 requests per minute per IP address. Exceeding this triggers a `429 Too Many Requests` response.

---

## 1. Authentication & DPDP Compliance (`/api/auth`)

### POST `/api/auth/register`
Creates a new user account. Auto-verifies if email domain matches the college domain.
*   **Authentication Required:** No
*   **Request Body (JSON):**
    ```json
    {
      "name": "Arjun Kumar",
      "email": "arjun@nitk.edu.in",
      "password": "securepassword123",
      "phone": "+919876543210",
      "collegeId": "d3b07384-d113-49cd-a5d6-8ee3c2e4758d",
      "stream": "Engineering",
      "branch": "Computer Science",
      "semester": 6,
      "skills": ["React Native", "TypeScript", "Node.js"],
      "bio": "Full stack enthusiast."
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "message": "Registered and verified via college domain!",
      "user": {
        "id": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
        "name": "Arjun Kumar",
        "email": "arjun@nitk.edu.in",
        "verified": true
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

### POST `/api/auth/login`
Authenticates user and returns a session token.
*   **Authentication Required:** No
*   **Request Body (JSON):**
    ```json
    {
      "email": "arjun@nitk.edu.in",
      "password": "securepassword123"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "user": {
        "id": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
        "name": "Arjun Kumar",
        "email": "arjun@nitk.edu.in",
        "verified": true,
        "college": "National Institute of Technology Karnataka",
        "branch": "Computer Science",
        "semester": 6,
        "isPremium": false
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

### POST `/api/auth/verify-id`
Uploads a physical ID card image for verification via OCR.
*   **Authentication Required:** Yes
*   **Content-Type:** `multipart/form-data`
*   **Request Body:**
    *   `idCard` (File, binary image)
*   **Response (202 Accepted):**
    ```json
    {
      "message": "ID card uploaded! Verification in progress — you'll be notified via the app.",
      "imageUrl": "/uploads/1720235948010_id_card.webp"
    }
    ```

### POST `/api/auth/send-otp`
Sends simulated phone verification OTP (Dev mode OTP is always `123456`).
*   **Authentication Required:** No
*   **Request Body (JSON):**
    ```json
    {
      "phone": "+919876543210"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "OTP sent successfully",
      "hint": "Dev OTP is 123456"
    }
    ```

### POST `/api/auth/verify-otp`
Verifies OTP to confirm phone number.
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "otp": "123456"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Phone verified successfully!"
    }
    ```

### GET `/api/auth/me`
Retrieves details of currently logged-in user.
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "id": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
      "name": "Arjun Kumar",
      "email": "arjun@nitk.edu.in",
      "phone": "+919876543210",
      "verified": true,
      "verificationType": "DOMAIN",
      "college": {
        "id": "d3b07384-d113-49cd-a5d6-8ee3c2e4758d",
        "name": "National Institute of Technology Karnataka",
        "location": "Surathkal",
        "domain": "nitk.edu.in"
      },
      "stream": "Engineering",
      "branch": "Computer Science",
      "semester": 6,
      "skills": ["React Native", "TypeScript"],
      "avatar": null,
      "portfolioLinks": [],
      "walletBalance": 120.50,
      "isPremium": false,
      "consents": [
        { "consentType": "PROFILE_SHARING", "granted": true },
        { "consentType": "CHAT", "granted": true }
      ],
      "createdAt": "2026-07-06T04:47:38.000Z"
    }
    ```

### PUT `/api/auth/consents`
Updates user consent records for DPDP compliance.
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "consents": [
        { "consentType": "MARKETING", "granted": true },
        { "consentType": "GEOLOCATION", "granted": false }
      ]
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Consents updated successfully"
    }
    ```

### GET `/api/auth/data-export`
Returns all personal data associated with the user account for DPDP data portability.
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "message": "Personal data export (DPDP compliance)",
      "data": {
        "id": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
        "name": "Arjun Kumar",
        "posts": [],
        "comments": [],
        "documents": [],
        "tickets": [],
        "sentMessages": [],
        "receivedMessages": [],
        "consents": []
      }
    }
    ```

### DELETE `/api/auth/account`
Anonymizes user profile and removes all personally identifiable info (PII) per DPDP Act.
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "message": "Account scrubbed and anonymized per DPDP Act. All PII erased."
    }
    ```

---

## 2. Feed & Community (`/api/feed`)

### POST `/api/feed/`
Creates a post. Run through moderation.
*   **Authentication Required:** Yes
*   **Content-Type:** `multipart/form-data`
*   **Request Body:**
    *   `content` (String, post text)
    *   `tags` (Stringified array, e.g., `["#exams", "#notes"]`)
    *   `media` (Files, binary images; max 5)
*   **Response (201 Created):**
    ```json
    {
      "id": "p98a213e-f1b2-32a4-44cd-ef124cfc0892",
      "userId": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
      "content": "Hey guys, uploaded CSE 6th sem notes in the marketplace!",
      "mediaUrls": ["/uploads/post_1720235948010.webp"],
      "tags": ["#exams", "#notes"],
      "likesCount": 0,
      "createdAt": "2026-07-06T10:17:34.000Z",
      "user": {
        "id": "a67b931d-b8d2-432d-8e42-7cf264cfc01e",
        "name": "Arjun Kumar",
        "avatar": null,
        "branch": "Computer Science"
      },
      "comments": []
    }
    ```

### GET `/api/feed/`
Fetches a paginated post feed. Filterable by college.
*   **Authentication Required:** No
*   **Query Parameters:**
    *   `collegeId` (Optional UUID)
    *   `page` (Optional, Default: `1`)
    *   `limit` (Optional, Default: `20`)
*   **Response (200 OK):**
    ```json
    {
      "posts": [
        {
          "id": "p98a213e-f1b2-32a4-44cd-ef124cfc0892",
          "content": "Hey guys...",
          "likesCount": 12,
          "_count": { "comments": 2 },
          "user": { "name": "Arjun Kumar", "college": { "name": "NITK" } }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "totalPages": 1
      }
    }
    ```

### GET `/api/feed/:id`
*   **Authentication Required:** No
*   **Response (200 OK):** Full post object with comments array.

### POST `/api/feed/:id/like`
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "likesCount": 13
    }
    ```

### POST `/api/feed/:id/comments`
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "content": "Awesome, thanks for uploading!"
    }
    ```
*   **Response (201 Created):** Comment object with author details.

### DELETE `/api/feed/:id`
Deletes a post (owner only).
*   **Authentication Required:** Yes
*   **Response (200 OK):** `{"message": "Post deleted"}`

### GET `/api/feed/spaces/:collegeId`
Fetches standard community channels for a specific college.
*   **Authentication Required:** No
*   **Response (200 OK):**
    ```json
    [
      { "id": "s1", "collegeId": "...", "name": "#general", "category": "Social" },
      { "id": "s2", "collegeId": "...", "name": "#pyqs", "category": "Academic" }
    ]
    ```

---

## 3. Real-Time Chat (`/api/chat`)

### GET `/api/chat/conversations`
Retrieves a list of private message threads with the latest message.
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    [
      {
        "partner": {
          "id": "b78c931d-b8d2-432d-8e42-7cf264cfc02f",
          "name": "Neha Sharma",
          "avatar": null,
          "branch": "Information Technology"
        },
        "lastMessage": {
          "content": "Are you joining the hackathon team?",
          "createdAt": "2026-07-06T10:12:00.000Z",
          "fromMe": false
        }
      }
    ]
    ```

### GET `/api/chat/messages/:partnerId`
Fetches paginated message history with a specific student.
*   **Authentication Required:** Yes
*   **Query Parameters:** `page` (Default: 1), `limit` (Default: 50)
*   **Response (200 OK):** Array of messages sorted chronologically.

### POST `/api/chat/messages`
Sends a chat message (also dispatched in real-time via Socket.io).
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "receiverId": "b78c931d-b8d2-432d-8e42-7cf264cfc02f",
      "content": "Yeah! Let's team up.",
      "mediaUrl": null
    }
    ```
*   **Response (201 Created):** Message object including sender and receiver names.

### GET `/api/chat/search-users`
Finds other users on campus to message.
*   **Authentication Required:** Yes
*   **Query Parameter:** `q` (Min 2 chars)
*   **Response (200 OK):** Array of matching users.

---

## 4. Academic Notes Marketplace (`/api/market`)

### POST `/api/market/documents`
Uploads a document. Queues async background processing for AI summarization.
*   **Authentication Required:** Yes
*   **Content-Type:** `multipart/form-data`
*   **Request Body:**
    *   `file` (File, PDF/Word/Image)
    *   `title` (String)
    *   `description` (String)
    *   `subjectCode` (String, e.g. "CS302")
    *   `semester` (Number)
    *   `branch` (String)
*   **Response (202 Accepted):**
    ```json
    {
      "message": "Document uploaded! AI summary is being generated.",
      "document": {
        "id": "d78d213e-f1b2-32a4-44cd-ef124cfc0821",
        "title": "DBMS PYQs 2025",
        "fileUrl": "/uploads/file_1720235948010.pdf",
        "upvotes": 0,
        "flags": 0
      }
    }
    ```

### GET `/api/market/documents`
Browses study notes uploaded across the platform.
*   **Authentication Required:** No
*   **Query Parameters:** `branch` (String), `semester` (Number), `subjectCode` (String), `page` (Default: 1), `limit` (Default: 20)
*   **Response (200 OK):** Paginated documents array.

---

## 5. AI Services & Matchmaking (`/api/ai`)

### POST `/api/ai/ask`
Queries the AI Academic Assistant. Checks semantic cache before hitting Gemini.
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "question": "What is normalisation in database management?"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "answer": "Database normalisation is the process of structuring a database...",
      "source": "gemini" // Or "cache", "fallback"
    }
    ```

### GET `/api/ai/summary/:documentId`
Retrieves AI summary for a document.
*   **Authentication Required:** No
*   **Response (200 OK - Summary Ready):**
    ```json
    {
      "id": "d78d213e-f1b2-32a4-44cd-ef124cfc0821",
      "title": "DBMS PYQs 2025",
      "summary": "1. Covers ER Diagrams.\n2. Normalisation questions included.\n...",
      "status": "ready"
    }
    ```
*   **Response (200 OK - Processing):**
    ```json
    {
      "id": "d78d213e-f1b2-32a4-44cd-ef124cfc0821",
      "status": "processing"
    }
    ```

### POST `/api/ai/matchmaking/tickets`
Creates a teammate search ticket.
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "projectTitle": "Smart Parking App",
      "description": "Building an Expo React Native mobile app with IoT integration.",
      "requiredSkills": ["React Native", "Tailwind CSS", "Node.js"],
      "lookingFor": "IoT Specialist"
    }
    ```
*   **Response (201 Created):** Created ticket details.

### GET `/api/ai/matchmaking/match`
Retrieves open tickets sorted by skill compatibility match score for the logged-in student.
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "t77b931d-b8d2-432d-8e42-7cf264cfc08a",
        "projectTitle": "Smart Parking App",
        "requiredSkills": ["React Native", "Tailwind CSS", "Node.js"],
        "matchScore": 67,
        "user": {
          "name": "Neha Sharma",
          "college": { "name": "NITK" }
        }
      }
    ]
    ```

---

## 6. Payments & Billing (`/api/billing`)

### POST `/api/billing/wallet/add`
Simulates depositing funds into the in-app wallet balance (Dev gateway).
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "amount": 500.00
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "walletBalance": 620.50,
      "message": "₹500 added to wallet"
    }
    ```

### POST `/api/billing/notes/purchase`
Purchases notes from the marketplace. Deducts balance from buyer, credits seller (minus a 10% platform service fee).
*   **Authentication Required:** Yes
*   **Request Body (JSON):**
    ```json
    {
      "documentId": "d78d213e-f1b2-32a4-44cd-ef124cfc0821",
      "price": 50.00
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "message": "Purchase successful",
      "transaction": {
        "documentId": "d78d213e-f1b2-32a4-44cd-ef124cfc0821",
        "documentTitle": "DBMS PYQs 2025",
        "buyerCharged": 50.00,
        "sellerCredited": 45.00,
        "platformFee": 5.00,
        "feeRate": "10%"
      }
    }
    ```

### GET `/api/billing/ads/targeted`
Fetches localized, branch-specific banner advertisements (disabled for Premium users).
*   **Authentication Required:** Yes
*   **Response (200 OK):**
    ```json
    {
      "ads": [
        {
          "id": "ad_internship_local",
          "type": "banner",
          "title": "Internships near Surathkal",
          "description": "Top companies hiring Computer Science students from Karnataka",
          "campusReach": 312
        }
      ]
    }
    ```

---

## 7. College Database Service (`/api/colleges`)

### GET `/api/colleges/search`
Fuzzy search of official government AISHE colleges using pg_trgm similarity rank.
*   **Authentication Required:** No
*   **Query Parameters:** `q` (Search query, min 2 chars), `state` (Optional filter), `managementType` (Optional filter), `limit` (Default: 15)
*   **Response (200 OK):**
    ```json
    [
      {
        "id": "d3b07384-d113-49cd-a5d6-8ee3c2e4758d",
        "name": "National Institute of Technology Karnataka",
        "location": "Surathkal",
        "domain": "nitk.edu.in",
        "aisheCode": "U-0234",
        "state": "Karnataka",
        "district": "Dakshina Kannada",
        "managementType": "Central Govt",
        "rank": 0.85
      }
    ]
    ```
