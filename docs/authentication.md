# Authentication

VOPI uses **OAuth 2.0** with JWT tokens for user authentication. Users sign in via Google or Apple.

## Authentication Methods

| Method | Use Case | Header |
|--------|----------|--------|
| **JWT Token** (recommended) | Mobile/Web apps with user accounts | `Authorization: Bearer <access_token>` |
| API Key | Server-to-server integrations | `x-api-key: <api_key>` |

---

## OAuth Flow Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   VOPI API      │     │  OAuth Provider │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. POST /auth/oauth/init                     │
         │──────────────────────>│                       │
         │                       │                       │
         │  { authorizationUrl, state, codeVerifier }    │
         │<──────────────────────│                       │
         │                       │                       │
         │  2. Open browser/WebView to authorizationUrl  │
         │─────────────────────────────────────────────>│
         │                       │                       │
         │  3. User signs in, redirects back with code   │
         │<─────────────────────────────────────────────│
         │                       │                       │
         │  4. POST /auth/oauth/callback                 │
         │──────────────────────>│                       │
         │                       │                       │
         │  { accessToken, refreshToken, user }          │
         │<──────────────────────│                       │
```

---

## Token Lifecycle

| Token | Expiration | Storage |
|-------|------------|---------|
| Access Token | 1 hour | Memory or secure storage |
| Refresh Token | 30 days | Secure storage (Keychain/Keystore) |

---

## Implementation Steps

### 1. Initialize OAuth

Request authorization URL from VOPI:

```typescript
const response = await fetch(`${API_URL}/api/v1/auth/oauth/init`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google', // or 'apple'
    redirectUri: 'com.yourapp://oauth/callback'
  }),
});

const { authorizationUrl, state, codeVerifier } = await response.json();

// Store state and codeVerifier securely for the callback
```

### 2. Open Authorization URL

Open the browser/WebView for user to sign in:

```typescript
// Expo
import * as WebBrowser from 'expo-web-browser';
const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);

// React Native (bare)
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
const result = await InAppBrowser.openAuth(authorizationUrl, redirectUri);
```

### 3. Handle Callback

Extract the authorization code and exchange for tokens:

```typescript
// Parse code from redirect URL
const url = new URL(result.url);
const code = url.searchParams.get('code');
const returnedState = url.searchParams.get('state');

// Validate state matches
if (returnedState !== storedState) {
  throw new Error('OAuth state mismatch');
}

// Exchange code for tokens
const response = await fetch(`${API_URL}/api/v1/auth/oauth/callback`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    code,
    redirectUri: 'com.yourapp://oauth/callback',
    state: storedState,
    codeVerifier: storedCodeVerifier,
  }),
});

const { accessToken, refreshToken, user } = await response.json();
```

### 4. Store Tokens Securely

```typescript
// Expo
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('access_token', accessToken);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// React Native (bare)
import EncryptedStorage from 'react-native-encrypted-storage';
await EncryptedStorage.setItem('access_token', accessToken);
await EncryptedStorage.setItem('refresh_token', refreshToken);
```

### 5. Token Refresh

Implement proactive token refresh before expiration:

```typescript
async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync('access_token');

  if (!accessToken) return null;

  // Decode JWT to check expiration
  const payload = JSON.parse(atob(accessToken.split('.')[1]));
  const expiresAt = payload.exp * 1000;
  const bufferMs = 60 * 1000; // 1 minute buffer

  if (expiresAt - bufferMs < Date.now()) {
    // Token expired or about to expire, refresh it
    return await refreshAccessToken();
  }

  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');

  if (!refreshToken) return null;

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Refresh failed, user needs to sign in again
    await clearAuth();
    return null;
  }

  const { accessToken, refreshToken: newRefreshToken } = await response.json();

  // Store new tokens
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', newRefreshToken);

  return accessToken;
}
```

---

## New User Benefits

- **5 free credits** on first sign-up (one-time, abuse-protected)
- Credits are used for video processing jobs

---

## Logout

```typescript
async function signOut() {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');

  if (refreshToken) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  }

  await clearAuth();
}

async function clearAuth() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync('user');
}
```

---

## Best Practices

1. **Store tokens securely**: Use Keychain (iOS) / Keystore (Android) / SecureStore (Expo)
2. **Implement token refresh**: Check token expiry before requests, refresh proactively
3. **Handle 401 errors**: Refresh token and retry, or redirect to login
4. **Clear tokens on logout**: Remove all stored tokens on logout
5. **Validate OAuth state**: Prevent CSRF attacks by validating the state parameter
