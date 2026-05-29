# CampusConnect Monorepo

Welcome to the **CampusConnect** workspace. CampusConnect is a cross-platform social, academic, and professional hub designed specifically for college students in India.

## Folder Structure
- `apps/server`: Express backend (TypeScript) with Prisma ORM, Socket.io (with Redis Pub/Sub capabilities), and Gemini AI integration.
- `apps/mobile`: React Native Expo app styled with NativeWind (Tailwind CSS) and optimized for both web (preview/dev) and mobile platforms.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v10+)
- PostgreSQL (ensure service is running locally on port 5432)

### Installation
From the root directory, run:
```bash
npm install
```

### Running Locally

1. **Backend Server:**
   - Configure `.env` in `apps/server` (see `apps/server/.env.example`).
   - Run Prisma migrations:
     ```bash
     cd apps/server
     npx prisma migrate dev --name init
     ```
   - Start development server:
     ```bash
     npm run server:dev
     ```

2. **Frontend Expo Client:**
   - Start the Expo development server (supports web, iOS, Android):
     ```bash
     npm run mobile:start
     ```
   - Launch in web browser:
     ```bash
     npm run mobile:web
     ```

## Deployment & Production
For cloud deployments (EAS Build), telemetry tools (Sentry & PostHog) are integrated via environment variables.

### Managing Secrets for EAS
Ensure your `.env` variables are added as secrets before kicking off the first build:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "your_sentry_dsn"
eas secret:create --scope project --name EXPO_PUBLIC_POSTHOG_API_KEY --value "your_posthog_key"
```

### Building the Release Candidate
```bash
eas build --platform all --profile preview
```
