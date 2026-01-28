import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { VOPIConfig, getRedirectUri } from '../config/vopi.config';
import { User } from '../types/vopi.types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';
import { decodeJWTPayload } from '../utils/strings';
import {
  validateOAuthState,
  exchangeOAuthCode,
  storeOAuthTokens,
  cleanupOAuthState,
} from '../utils/oauth';

// Ensure web browser auth sessions are dismissed
WebBrowser.maybeCompleteAuthSession();

// Types
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<string | null> | null>(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    isMounted.current = true;
    loadStoredAuth();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSetState = useCallback((newState: AuthState | ((prev: AuthState) => AuthState)) => {
    if (isMounted.current) {
      setState(newState);
    }
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [accessToken, refreshToken, userJson] = await Promise.all([
        storage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        storage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        storage.getItem(STORAGE_KEYS.USER),
      ]);

      if (__DEV__) {
        console.log('[Auth] Loading stored auth:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          hasUser: !!userJson,
        });
      }

      // No stored credentials - user needs to sign in
      if (!accessToken || !userJson) {
        safeSetState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const storedUser = JSON.parse(userJson) as User;

      // Restore session immediately with stored user (optimistic)
      // This prevents logout on network issues
      safeSetState({
        user: storedUser,
        isLoading: false,
        isAuthenticated: true,
      });

      // Proactively refresh if token is expired or about to expire
      let validToken = accessToken;
      const payload = decodeJWTPayload(accessToken);
      if (payload && typeof payload.exp === 'number') {
        const bufferMs = 60 * 1000; // 1 minute buffer
        if (payload.exp * 1000 - bufferMs < Date.now()) {
          if (__DEV__) {
            console.log('[Auth] Stored token expired, refreshing before profile fetch');
          }
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            validToken = refreshed;
          } else if (refreshToken) {
            // Refresh token also invalid - clear auth
            if (__DEV__) {
              console.log('[Auth] Refresh token invalid, clearing auth');
            }
            await clearAuth();
            safeSetState({ user: null, isLoading: false, isAuthenticated: false });
            return;
          }
          // If no refresh token, try with expired token as fallback
        }
      }

      // Try to refresh user data in the background
      try {
        const freshUser = await fetchUserProfile(validToken);
        safeSetState({
          user: freshUser,
          isLoading: false,
          isAuthenticated: true,
        });
        await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (__DEV__) {
          console.log('[Auth] Failed to fetch fresh user:', {
            error: errorMessage,
            errorType: error instanceof Error ? error.name : typeof error,
          });
        }

        // Check if token is expired (401) vs network error
        const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized');

        if (isAuthError && refreshToken) {
          // Token rejected - try to refresh (handles edge case where proactive refresh was skipped)
          const newToken = await refreshAccessToken();
          if (newToken) {
            try {
              const freshUser = await fetchUserProfile(newToken);
              safeSetState({
                user: freshUser,
                isLoading: false,
                isAuthenticated: true,
              });
              await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
            } catch {
              if (__DEV__) {
                console.log('[Auth] Token refreshed but profile fetch failed, keeping stored user');
              }
            }
          } else {
            if (__DEV__) {
              console.log('[Auth] Refresh token invalid, clearing auth');
            }
            await clearAuth();
            safeSetState({ user: null, isLoading: false, isAuthenticated: false });
          }
        }
        // For network/server errors, keep the stored session (already set above)
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Auth] Error loading stored auth:', error);
      }
      safeSetState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const fetchUserProfile = async (accessToken: string): Promise<User> => {
    const apiUrl = `${VOPIConfig.apiUrl}/api/v1/auth/me`;

    if (__DEV__) {
      // Log token preview for debugging (first 10 and last 10 chars)
      const tokenPreview = accessToken.length > 20
        ? `${accessToken.slice(0, 10)}...${accessToken.slice(-10)}`
        : '[short token]';

      // Decode JWT payload to see claims
      const payload = decodeJWTPayload(accessToken);
      const tokenInfo: Record<string, unknown> = {
        url: apiUrl,
        tokenPreview,
        tokenLength: accessToken.length,
      };

      if (payload) {
        const expNum = typeof payload.exp === 'number' ? payload.exp : null;
        tokenInfo.payload = {
          sub: payload.sub,
          exp: payload.exp,
          iat: payload.iat,
          type: payload.type, // Should be 'access', NOT 'refresh'
          expiresIn: expNum ? `${Math.round((expNum * 1000 - Date.now()) / 1000)}s` : 'unknown',
          isExpired: expNum ? expNum * 1000 < Date.now() : 'unknown',
        };

        // CRITICAL: Warn if wrong token type
        if (payload.type !== 'access') {
          console.error('[Auth] ⚠️ WRONG TOKEN TYPE! Expected "access", got:', payload.type);
        }
      } else {
        tokenInfo.payloadError = 'Could not decode JWT payload';
      }

      console.log('[Auth] Fetching user profile:', tokenInfo);
    }

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorBody = '';
      try {
        const errorData = await response.json();
        errorBody = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch {
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Could not read error body';
        }
      }

      if (__DEV__) {
        console.error('[Auth] User profile fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody,
          url: apiUrl,
        });
      }

      // Include status code and error body for proper debugging
      throw new Error(`Failed to fetch user profile (${response.status}): ${errorBody}`);
    }

    const profile = await response.json();

    if (__DEV__) {
      console.log('[Auth] User profile fetched successfully:', {
        id: profile.id,
        email: profile.email,
      });
    }

    // Also fetch credit balance
    const balanceResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/credits/balance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let creditsBalance = 0;
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      creditsBalance = balanceData.balance;
    } else if (__DEV__) {
      console.warn('[Auth] Failed to fetch credit balance:', {
        status: balanceResponse.status,
      });
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      creditsBalance,
    };
  };

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    try {
      safeSetState((prev) => ({ ...prev, isLoading: true }));

      const redirectUri = getRedirectUri();

      // Step 1: Initialize OAuth
      const initResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, redirectUri, platform: Platform.OS }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to initialize OAuth (${initResponse.status})`);
      }

      const initData = await initResponse.json();
      // Handle both camelCase and snake_case from backend
      const authorizationUrl = initData.authorizationUrl || initData.authorization_url;
      const oauthState = initData.state;
      const codeVerifier = initData.codeVerifier || initData.code_verifier;

      // Debug logging for OAuth init
      if (__DEV__) {
        console.log('[OAuth] Init response:', {
          hasAuthUrl: !!authorizationUrl,
          hasState: !!oauthState,
          hasCodeVerifier: !!codeVerifier,
          codeVerifierLength: codeVerifier?.length,
        });
      }

      // Store OAuth state temporarily
      await storage.setItem(STORAGE_KEYS.OAUTH_STATE, oauthState);
      if (codeVerifier) {
        await storage.setItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER, codeVerifier);
      }
      await storage.setItem(STORAGE_KEYS.OAUTH_PROVIDER, provider);

      // Verify storage worked
      if (__DEV__) {
        const storedVerifier = await storage.getItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER);
        console.log('[OAuth] Stored codeVerifier:', {
          stored: !!storedVerifier,
          length: storedVerifier?.length,
        });
      }

      // Step 2: Open browser for OAuth
      if (Platform.OS === 'web') {
        // On web, redirect directly - the callback page will handle the rest
        window.location.href = authorizationUrl;
        return;
      }

      // On mobile, use WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);

      if (result.type !== 'success' || !result.url) {
        safeSetState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Step 3: Extract code from redirect URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Validate OAuth state
      const validation = await validateOAuthState(returnedState || '');
      if (!validation.isValid) {
        throw new Error(validation.error || 'OAuth validation failed');
      }

      // Exchange code for tokens
      const tokens = await exchangeOAuthCode({
        code,
        redirectUri,
        provider: validation.storedProvider!,
        state: validation.storedState!,
        codeVerifier: validation.storedCodeVerifier,
      });

      // Store tokens and clean up
      await storeOAuthTokens(tokens);
      await cleanupOAuthState();

      safeSetState({
        user: tokens.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      safeSetState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [safeSetState]);

  const signInWithGoogle = useCallback(() => signInWithProvider('google'), [signInWithProvider]);
  const signInWithApple = useCallback(() => signInWithProvider('apple'), [signInWithProvider]);

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        // Revoke token on server with proper error handling
        try {
          const response = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok && __DEV__) {
            console.warn('[Auth] Logout request failed with status:', response.status);
          }
        } catch (error) {
          // Log logout errors in development for debugging
          if (__DEV__) {
            console.warn('[Auth] Logout request failed:', error instanceof Error ? error.message : 'Unknown error');
          }
          // Continue with local logout even if server request fails
        }
      }
    } finally {
      await clearAuth();
      safeSetState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, [safeSetState]);

  const clearAuth = async () => {
    await Promise.all([
      storage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
      storage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
      storage.deleteItem(STORAGE_KEYS.USER),
    ]);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    // Prevent concurrent refresh requests - check both flag and promise
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;
    refreshPromise.current = (async () => {
      try {
        const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
          return null;
        }

        const response = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          await clearAuth();
          return null;
        }

        const data = await response.json();
        const { accessToken, refreshToken: newRefreshToken } = data;

        if (__DEV__) {
          // Decode both tokens to verify their types
          const accessPayload = decodeJWTPayload(accessToken);
          const refreshPayload = decodeJWTPayload(newRefreshToken);

          console.log('[Auth] Token refresh response:', {
            accessTokenLength: accessToken?.length,
            refreshTokenLength: newRefreshToken?.length,
            accessTokenType: accessPayload?.type, // Should be 'access'
            refreshTokenType: refreshPayload?.type, // Should be 'refresh'
            responseKeys: Object.keys(data),
          });

          // Warn if tokens have wrong types
          if (accessPayload?.type !== 'access') {
            console.error('[Auth] ⚠️ accessToken has wrong type:', accessPayload?.type);
          }
          if (refreshPayload?.type !== 'refresh') {
            console.error('[Auth] ⚠️ refreshToken has wrong type:', refreshPayload?.type);
          }
        }

        await Promise.all([
          storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
          storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken),
        ]);

        return accessToken;
      } catch {
        return null;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  };

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const accessToken = await storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!accessToken) {
      if (__DEV__) {
        console.log('[Auth] getAccessToken: No token in storage');
      }
      return null;
    }

    // Check if token is expired using safe decoder
    const payload = decodeJWTPayload(accessToken);

    if (__DEV__) {
      console.log('[Auth] getAccessToken: Token from storage has type:', payload?.type);
    }

    if (payload && typeof payload.exp === 'number') {
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const bufferMs = 60 * 1000; // 1 minute buffer

      if (expiresAt - bufferMs < now) {
        // Token is expired or about to expire, refresh it
        if (__DEV__) {
          console.log('[Auth] getAccessToken: Token expired, refreshing...');
        }
        return await refreshAccessToken();
      }
    }

    return accessToken;
  }, []);

  const refreshUser = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (accessToken) {
      const freshUser = await fetchUserProfile(accessToken);
      safeSetState((prev) => ({ ...prev, user: freshUser }));
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    }
  }, [getAccessToken, safeSetState]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithGoogle,
        signInWithApple,
        signOut,
        refreshUser,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
