# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Start Expo development server
pnpm ios              # Run on iOS simulator
pnpm android          # Run on Android emulator
pnpm web              # Run in web browser
```

## Architecture

### Tech Stack
- Expo SDK 54 with React Native 0.81.5
- expo-router for file-based routing
- Zustand for local state, React Context for auth, TanStack Query for server state
- TypeScript with strict mode

### Directory Structure

```
app/                    # Expo Router pages (file-based routing)
├── _layout.tsx         # Root layout with providers (Auth, Query)
├── (auth)/             # Unauthenticated routes
│   └── login.tsx       # OAuth login screen
├── (tabs)/             # Protected tab navigation
│   ├── index.tsx       # Home - video upload
│   ├── capture.tsx     # Camera recording
│   ├── products.tsx    # Job history list
│   └── settings.tsx    # User profile, credits
└── results.tsx         # Modal for viewing results

src/
├── contexts/AuthContext.tsx     # OAuth + token management
├── services/
│   ├── api.client.ts            # HTTP client singleton
│   └── vopi.service.ts          # All API endpoints
├── hooks/
│   ├── useVOPIUpload.ts         # Upload flow + polling
│   └── useCredits.ts            # Credit balance
├── stores/                      # Zustand stores
├── components/                  # Reusable UI
└── types/vopi.types.ts          # TypeScript definitions
```

### Key Patterns

**Authentication Flow (src/contexts/AuthContext.tsx)**
- OAuth with PKCE via expo-web-browser
- Tokens stored in expo-secure-store (encrypted)
- Automatic refresh with 1-minute expiry buffer
- Concurrent refresh prevention using useRef

**API Client (src/services/api.client.ts)**
- Singleton with `setTokenGetter()` for auth injection
- All requests go through this client, not direct fetch
- Initialized in app/_layout.tsx

**Upload Flow (src/hooks/useVOPIUpload.ts)**
1. Get presigned S3 URL → 2. Upload video → 3. Create job → 4. Poll status (3s interval, 200 max attempts) → 5. Fetch download URLs

**State Types (src/types/vopi.types.ts)**
- `UploadState`: Discriminated union - idle | uploading | processing | completed | error | cancelled
- `JobStatusType`: pending → downloading → extracting → scoring → classifying → extracting_product → generating → completed/failed/cancelled

### Route Protection
- `(tabs)/*` requires authentication, redirects to login if not
- `(auth)/*` redirects to tabs if authenticated
- Check isAuthenticated from useAuth() hook

### API Configuration
```typescript
// src/config/vopi.config.ts
apiUrl: 'https://api.vopi.24rabbit.com'
pollingInterval: 3000      // 3 seconds
maxPollingAttempts: 200    // ~10 minutes max
```

### Path Aliases
Configured in tsconfig.json: `@/components`, `@/hooks`, `@/services`, `@/stores`, `@/types`, `@/contexts`, `@/config`
