# Workly Monorepo

Welcome to **Workly** — a secure, cross-platform social, academic, and professional hub designed specifically for college students in India. Workly consolidates fragmented campus communications into a single dashboard.

## 🚀 Key Features

*   **Verified Campus Communities:** Automatically verifies users based on official college email domains or ID card uploads parsed via background OCR matching.
*   **Academic Notes Marketplace:** Buy and sell study resources (PYQs, lecture notes, textbooks) using a secure virtual wallet system.
*   **Real-time Group & Direct Messaging:** Multi-node Socket.io scaling backed by Redis Pub/Sub for instantaneous message delivery.
*   **Project Teammate Matchmaker:** Create partner search cards and review ranked peer lists sorted by skill set compatibility.
*   **AI Academic Helper:** Ask class-related questions powered by Google Gemini, equipped with local semantic caching to save on latency and costs.
*   **DPDP Compliance:** In-app consent controllers, download data export tools, and full profile anonymization scrub routines.

---

## 📂 Project Structure

Workly is configured as an npm workspaces monorepo:

```
Workly/
├── package.json              # Monorepo workspaces coordinator
├── README.md                 # Project introduction (this file)
├── TESTING.md                # Local environment setup instructions
├── apps/
│   ├── server/               # Express backend application (Node.js, TypeScript)
│   └── mobile/               # Mobile React Native application (Expo, NativeWind)
```

---

## 🛠️ Prerequisites

Before launching the local server, ensure the following services are installed and active on your system:
*   **Node.js** (v18+)
*   **npm** (v10+)
*   **PostgreSQL** (Active local service on port 5432)
*   **Redis** (Active local service on port 6379)

---

## 🏁 Getting Started

### 1. Installation
From the root monorepo directory, run npm install to set up all package dependencies across workspaces:
```bash
npm install
```

### 2. Configure Environment Variables
You must set up `.env` files in both application folders:
*   **Server Config:** Copy `apps/server/.env.example` to `apps/server/.env` and update the values (Prisma database URL, Redis server port, Gemini API token).
*   **Mobile Config:** Copy `apps/mobile/.env.example` (or refer to the root `.env.example`) to `apps/mobile/.env` and specify the API server host address.
*   *Note: For detailed environment descriptions, refer to the root [.env.example](file:///c:/Users/Vastav/Documents/Workly/.env.example).*

### 3. Apply DB Schema & Seed Data
Navigate to the server workspace to run PostgreSQL migrations and import the official AISHE college database:
```bash
cd apps/server

# Build the migrations
npx prisma migrate dev --name init

# Seed the official database list
npm run db:seed
```

### 4. Running Locally

#### Run Backend Server:
Start the Express API development server (listens on port 5000):
```bash
# From root directory
npm run server:dev
```

#### Run Mobile App:
Launch the Expo bundler:
```bash
# From root directory
npm run mobile:start
```
Scan the terminal QR code using the Expo Go application on a physical phone to start previewing.

*Note: For troubleshooting path bundler errors on Windows, refer to the [TESTING.md](file:///c:/Users/Vastav/Documents/Workly/TESTING.md) developer guide.*

---

## ⚙️ CI/CD & EAS Deployments
For production builds, mobile telemetry metrics (Sentry & PostHog) are managed via Expo Application Services (EAS) environment credentials:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "your_dsn_key"
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_API_KEY --value "your_posthog_key"
```

Compile a preview release bundle:
```bash
eas build --platform all --profile preview
```
