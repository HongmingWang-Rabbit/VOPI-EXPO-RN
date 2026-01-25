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
```

## Tech Stack

- **Expo SDK 54** - React Native framework
- **expo-router** - File-based routing
- **Zustand** - State management
- **TanStack Query** - Data fetching
- **TypeScript** - Type safety

## Project Structure

```
src/
├── config/         # App configuration
├── contexts/       # React contexts (Auth)
├── hooks/          # Custom hooks
├── services/       # API clients
├── types/          # TypeScript types
├── components/     # Reusable components
└── screens/        # Screen components

app/                # Expo Router pages
docs/               # Documentation
```

## API

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.vopi.24rabbit.com` |
| Development | `http://localhost:3000` |

## Features

- OAuth authentication (Google/Apple)
- Video upload with progress tracking
- Real-time job status polling
- Commercial image generation
- Credit system with Stripe checkout

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](./docs/api-reference.md) | Complete API endpoints |
| [Authentication](./docs/authentication.md) | OAuth flow and token management |
| [Architecture](./docs/architecture.md) | System design and flow diagrams |
| [Best Practices](./docs/best-practices.md) | Implementation guidelines |
| [Expo Integration](./docs/expo-integration.md) | Expo-specific setup and examples |
| [React Native Integration](./docs/react-native-integration.md) | Bare React Native setup |

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

## License

Proprietary - All rights reserved.
