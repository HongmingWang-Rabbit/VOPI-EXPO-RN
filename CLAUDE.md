# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm start            # Start Expo development server
pnpm ios              # Run on iOS simulator
pnpm android          # Run on Android emulator
pnpm web              # Run in web browser
pnpm test             # Run tests with Jest
pnpm test:watch       # Run tests in watch mode
pnpm typecheck        # Run TypeScript type checking
```

## Architecture

### Tech Stack
- Expo SDK 54 with React Native 0.81.5
- expo-router for file-based routing
- React Context for auth, TanStack Query for server state
- TypeScript with strict mode

### Directory Structure

```
app/                    # Expo Router pages (file-based routing)
├── _layout.tsx         # Root layout with providers (Auth, Query)
├── (auth)/             # Unauthenticated routes
│   └── login.tsx       # Animated OAuth login with app icon + sparkles
├── (tabs)/             # Protected tab navigation
│   ├── index.tsx       # Home - video upload
│   ├── capture.tsx     # Camera recording with tips overlay
│   ├── products.tsx    # Job history list with delete
│   └── settings.tsx    # User profile, credits, connected platforms
├── results.tsx         # View results + push to Shopify/Amazon
└── oauth/
    └── callback.tsx    # Web OAuth callback handler

src/
├── config/
│   ├── env.ts               # Environment configuration
│   └── vopi.config.ts       # API configuration
├── constants/
│   └── storage.ts           # Storage key constants
├── contexts/
│   └── AuthContext.tsx      # OAuth + token management
├── services/
│   ├── api.client.ts        # HTTP client with retry logic
│   └── vopi.service.ts      # All API endpoints
├── hooks/
│   ├── useVOPIUpload.ts     # Upload flow + polling
│   ├── useCredits.ts        # Credit balance
│   ├── useConnections.ts    # Platform connections (Shopify, Amazon)
│   └── useResponsive.ts     # Responsive design
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── ErrorBoundary.tsx
│   │   ├── UploadProgress.tsx
│   │   ├── VideoPicker.tsx
│   │   └── WebContainer.tsx
│   ├── product/
│   │   ├── EditableField.tsx     # Inline-editable metadata field
│   │   └── FlatImageGallery.tsx  # Swipeable carousel with thumbnails
│   └── platform/
│       └── ConnectionCard.tsx    # Platform connection status card
├── theme/
│   ├── colors.ts            # Color palette (slate/blue)
│   ├── spacing.ts           # Spacing, border radius, shadows
│   ├── typography.ts        # Font sizes, weights, line heights
│   └── index.ts             # Theme exports
├── utils/
│   ├── errors.ts            # Typed error classes
│   ├── storage.ts           # Cross-platform storage
│   └── strings.ts           # String utilities
├── types/
│   └── vopi.types.ts        # TypeScript definitions
└── __tests__/               # Test files
    ├── api.client.test.ts
    ├── vopi.service.test.ts
    ├── useVOPIUpload.test.ts
    ├── AuthContext.test.tsx
    ├── errors.test.ts
    ├── storage.test.ts
    └── strings.test.ts
```

### Key Patterns

**Authentication Flow (src/contexts/AuthContext.tsx)**
- OAuth with PKCE via expo-web-browser
- Tokens stored in expo-secure-store (native) / localStorage (web)
- OAuth state stored in sessionStorage (web only, cleared on close)
- Automatic refresh with 1-minute expiry buffer
- Proactive token refresh on startup (checks JWT exp before profile fetch)
- Concurrent refresh prevention using useRef
- Optimistic session restoration (keeps stored user on network errors)

**API Client (src/services/api.client.ts)**
- Singleton with `setTokenGetter()` for auth injection
- Automatic retry with exponential backoff (2 retries default)
- Robust network error detection
- Timeout handling with AbortController
- 204 No Content handling (returns undefined)
- Initialized in app/_layout.tsx

**Upload Flow (src/hooks/useVOPIUpload.ts)**
1. Get presigned S3 URL
2. Upload video with retry (3 attempts)
3. Create job
4. Poll status (3s interval, 200 max attempts)
5. Fetch download URLs

Consecutive polling errors (5) will stop and show error.

**Error Handling (src/utils/errors.ts)**
- `APIError`: HTTP errors with status, code, details
- `NetworkError`: Connection failures
- `TimeoutError`: Request timeouts
- Type guards: `isAPIError()`, `isNetworkError()`, `isTimeoutError()`

**Storage Keys (src/constants/storage.ts)**
```typescript
STORAGE_KEYS = {
  ACCESS_TOKEN: 'vopi_access_token',
  REFRESH_TOKEN: 'vopi_refresh_token',
  USER: 'vopi_user',
  OAUTH_STATE: 'oauth_state',
  OAUTH_CODE_VERIFIER: 'oauth_code_verifier',
  OAUTH_PROVIDER: 'oauth_provider',
}
```

**State Types (src/types/vopi.types.ts)**
- `UploadState`: Discriminated union - idle | uploading | processing | completed | error | cancelled
- `JobStatusType`: pending → downloading → extracting → scoring → classifying → extracting_product → generating → completed/failed/cancelled

**Platform Connections & Shopify Integration (src/hooks/useConnections.ts)**
- `useConnections()` hook fetches and caches platform connections
- Exposes `connections`, `shopifyConnections`, `amazonConnections`, `activeShopifyConnection`, `activeAmazonConnection`, `loading`, `error`, `refresh`
- Settings screen shows "Connected Platforms" section with status badges and disconnect option
- Shopify OAuth flow: user enters store name → `getShopifyAuthUrl(shop)` returns JSON auth URL → opens in browser → backend handles callback → frontend refreshes connections
- Results screen shows "Push to Shopify" button when an active Shopify connection exists
- Push sends product metadata (excluding `confidence`) with optional draft mode

**Platform Types (src/types/vopi.types.ts)**
- `PlatformType`: `'shopify' | 'amazon' | 'ebay'`
- `PlatformConnection`: id, platform, platformAccountId, status (active/expired/revoked), metadata, lastError
- `PushToListingRequest`: jobId, connectionId, options (publishAsDraft, overrideMetadata)

**Platform API Endpoints (src/services/vopi.service.ts)**
- `getConnections()` → `GET /api/v1/connections`
- `getShopifyAuthUrl(shop)` → `GET /api/v1/oauth/shopify/authorize?shop=...&response_type=json` → `{ authUrl }`
- `disconnectConnection(id)` → `DELETE /api/v1/connections/:id`
- `pushToListing(request)` → `POST /api/v1/listings/push`
- `getListing(id)` → `GET /api/v1/listings/:id`

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
uploadTimeout: 300000      // 5 minutes
requestTimeout: 30000      // 30 seconds
```

### Environment Configuration
```typescript
// src/config/env.ts - loaded from app.json extra config
env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  webUrl: process.env.EXPO_PUBLIC_WEB_URL,
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
}
```

### Theme System (src/theme/)

**Color Palette (colors.ts)** — Slate/blue design system
- Primary: `#2563EB` (blue-600), primaryLight: `#3B82F6`, primaryDark: `#1D4ED8`, primaryBackground: `#EFF6FF`
- Success: `#34C759`, successLight: `#E8F8EC`
- Error: `#FF3B30`, errorLight: `#FFF5F5`
- Warning: `#FF9500`, warningLight: `#FFF8E6`
- Neutral (slate scale): text `#1E293B`, textSecondary `#64748B`, textTertiary `#718096` (WCAG AA)
- Border: `#E2E8F0`, borderDark: `#CBD5E1`
- Backgrounds: `#FFFFFF`, secondary `#F8FAFC`, tertiary `#F1F5F9`
- Accent (decorative): accentPurple `#C084FC`, accentAmber `#F59E0B`, accentCyan `#22D3EE`
- Overlay: `rgba(0,0,0,0.5)`, overlayLight `rgba(0,0,0,0.1)`, overlayDark `rgba(0,0,0,0.95)`

**Shadows (spacing.ts)** — Standardized elevation presets
- `shadows.sm`: subtle (offset 0,1 opacity 0.05 radius 3, elevation 1)
- `shadows.md`: standard card (offset 0,2 opacity 0.08 radius 8, elevation 2)
- `shadows.lg`: elevated (offset 0,4 opacity 0.12 radius 16, elevation 4)

**Typography (typography.ts)** — fontSize, fontWeight, lineHeight tokens

### Testing
- Jest + React Native Testing Library
- Test files in `src/__tests__/`
- Run: `pnpm test` or `pnpm test:watch`
