import { Platform } from 'react-native';
import { VOPIConfig } from '../config/vopi.config';
import { storage } from './storage';
import { STORAGE_KEYS } from '../constants/storage';
import { User } from '../types/vopi.types';
import { decodeJWTPayload } from './strings';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  redirectUri: string;
}

/**
 * Validates OAuth state to prevent CSRF attacks
 */
export async function validateOAuthState(returnedState: string): Promise<{
  isValid: boolean;
  storedState: string | null;
  storedCodeVerifier: string | null;
  storedProvider: string | null;
  error?: string;
}> {
  const [storedState, storedCodeVerifier, storedProvider] = await Promise.all([
    storage.getItem(STORAGE_KEYS.OAUTH_STATE),
    storage.getItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER),
    storage.getItem(STORAGE_KEYS.OAUTH_PROVIDER),
  ]);

  if (!storedState || !returnedState) {
    return {
      isValid: false,
      storedState,
      storedCodeVerifier,
      storedProvider,
      error: 'OAuth state missing - session may have expired',
    };
  }

  if (returnedState !== storedState) {
    return {
      isValid: false,
      storedState,
      storedCodeVerifier,
      storedProvider,
      error: 'OAuth state mismatch - possible CSRF attack',
    };
  }

  if (!storedProvider) {
    return {
      isValid: false,
      storedState,
      storedCodeVerifier,
      storedProvider,
      error: 'OAuth session expired - please try again',
    };
  }

  return {
    isValid: true,
    storedState,
    storedCodeVerifier,
    storedProvider,
  };
}

/**
 * Exchanges OAuth authorization code for tokens
 */
export async function exchangeOAuthCode(params: {
  code: string;
  redirectUri: string;
  provider: string;
  state: string;
  codeVerifier?: string | null;
}): Promise<OAuthTokens> {
  const { code, redirectUri, provider, state, codeVerifier } = params;

  const callbackBody: Record<string, unknown> = {
    provider,
    code,
    redirectUri,
    state,
    platform: Platform.OS,
    deviceInfo: {
      deviceName: Platform.OS === 'web' ? 'Web Browser' : 'Expo App',
    },
  };

  // Include codeVerifier if available (for PKCE flow)
  if (codeVerifier) {
    callbackBody.codeVerifier = codeVerifier;
    callbackBody.code_verifier = codeVerifier; // Also send snake_case for backend compatibility
  }

  if (__DEV__) {
    console.log('[OAuth] Exchanging code for tokens:', {
      provider,
      hasCode: !!code,
      hasCodeVerifier: !!codeVerifier,
      platform: Platform.OS,
    });
  }

  const response = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(callbackBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to exchange code for tokens (${response.status})`);
  }

  const data = await response.json();
  const { accessToken, refreshToken, user } = data;

  if (__DEV__) {
    // Verify token types
    const accessPayload = decodeJWTPayload(accessToken);
    const refreshPayload = decodeJWTPayload(refreshToken);

    console.log('[OAuth] Token exchange successful:', {
      accessTokenType: accessPayload?.type,
      refreshTokenType: refreshPayload?.type,
    });

    if (accessPayload?.type !== 'access') {
      console.error('[OAuth] accessToken has wrong type:', accessPayload?.type);
    }
  }

  return { accessToken, refreshToken, user };
}

/**
 * Stores OAuth tokens and user data
 */
export async function storeOAuthTokens(tokens: OAuthTokens): Promise<void> {
  await Promise.all([
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(tokens.user)),
  ]);
}

/**
 * Cleans up OAuth temporary state after authentication
 */
export async function cleanupOAuthState(): Promise<void> {
  await Promise.all([
    storage.deleteItem(STORAGE_KEYS.OAUTH_STATE),
    storage.deleteItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER),
    storage.deleteItem(STORAGE_KEYS.OAUTH_PROVIDER),
  ]);
}
