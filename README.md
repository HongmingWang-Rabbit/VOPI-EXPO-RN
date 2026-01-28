# VOPI Mobile App

Mobile application for VOPI (Video Object Processing Infrastructure) - extract high-quality product photography frames from videos and generate commercial images.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Run tests
pnpm test
```

## Tech Stack

- **Expo SDK 54** - React Native framework
- **expo-router** - File-based routing
- **React Context** - Authentication state
- **TanStack Query** - Data fetching
- **TypeScript** - Type safety
- **Jest** - Testing framework

## Project Structure

```
src/
├── config/         # App and environment configuration
├── constants/      # Storage keys and constants
├── contexts/       # React contexts (Auth)
├── hooks/          # Custom hooks (upload, credits)
├── services/       # API clients
├── types/          # TypeScript types
├── components/     # Reusable UI components
├── theme/          # Colors, spacing, typography
├── utils/          # Utilities (errors, storage, strings)
└── __tests__/      # Test files

app/                # Expo Router pages
docs/               # Documentation
```

## API

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.vopi.24rabbit.com` |
| Development | `http://localhost:3000` |

## Features

- OAuth authentication (Google/Apple) with PKCE
- Video upload with retry logic and progress tracking
- Real-time job status polling
- Commercial image generation
- Credit system with Stripe checkout
- Error boundary for graceful error handling
- Accessibility support (ARIA labels, screen reader compatible)

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](./docs/api-reference.md) | Complete API endpoints |
| [Authentication](./docs/authentication.md) | OAuth flow and token management |
| [Architecture](./docs/architecture.md) | System design and flow diagrams |
| [Best Practices](./docs/best-practices.md) | Implementation guidelines |
| [Expo Integration](./docs/expo-integration.md) | Expo-specific setup and examples |
| [React Native Integration](./docs/react-native-integration.md) | Bare React Native setup |
| [Testing](./docs/testing.md) | Test setup and patterns |

## Configuration

Update `app.json` with your app details:

```json
{
  "expo": {
    "scheme": "myvopiapp",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myvopiapp"
    },
    "android": {
      "package": "com.yourcompany.myvopiapp"
    },
    "extra": {
      "apiUrl": "https://api.vopi.24rabbit.com",
      "webUrl": "https://your-web-url.com"
    }
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo development server |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android emulator |
| `pnpm web` | Run in web browser |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | TypeScript type checking |

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test --coverage
```

Test files are located in `src/__tests__/` covering:
- API client (retry logic, error handling)
- VOPI service (all endpoints)
- Upload hook (states, polling, cancellation)
- Auth context (OAuth, token refresh)
- Utility functions

## License

Proprietary - All rights reserved.
