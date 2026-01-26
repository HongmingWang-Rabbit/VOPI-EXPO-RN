import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { VOPIConfig, getRedirectUri } from '../config/vopi.config';
import { User } from '../types/vopi.types';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';
import { decodeJWTPayload } from '../utils/strings';

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

      // Try to refresh user data in the background
      try {
        const freshUser = await fetchUserProfile(accessToken);
        safeSetState({
          user: freshUser,
          isLoading: false,
          isAuthenticated: true,
        });
        await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
      } catch (error) {
        if (__DEV__) {
          console.log('[Auth] Failed to fetch fresh user, checking if token expired:', error);
        }

        // Check if token is expired (401) vs network error
        const isAuthError = error instanceof Error &&
          (error.message.includes('401') || error.message.includes('Unauthorized'));

        if (isAuthError && refreshToken) {
          // Token expired - try to refresh
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
              // Refresh worked but profile fetch failed - keep stored user
              if (__DEV__) {
                console.log('[Auth] Token refreshed but profile fetch failed, keeping stored user');
              }
            }
          } else {
            // Refresh token also invalid - clear auth
            if (__DEV__) {
              console.log('[Auth] Refresh token invalid, clearing auth');
            }
            await clearAuth();
            safeSetState({ user: null, isLoading: false, isAuthenticated: false });
          }
        }
        // For network errors, keep the stored session (already set above)
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Auth] Error loading stored auth:', error);
      }
      safeSetState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const fetchUserProfile = async (accessToken: string): Promise<User> => {
    const response = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = await response.json();

    // Also fetch credit balance
    const balanceResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/credits/balance`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let creditsBalance = 0;
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      creditsBalance = balanceData.balance;
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

      // Retrieve stored OAuth state
      const storedState = await storage.getItem(STORAGE_KEYS.OAUTH_STATE);
      const storedCodeVerifier = await storage.getItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER);
      const storedProvider = await storage.getItem(STORAGE_KEYS.OAUTH_PROVIDER);

      // Debug logging for OAuth callback
      if (__DEV__) {
        console.log('[OAuth] Retrieved from storage:', {
          hasState: !!storedState,
          hasCodeVerifier: !!storedCodeVerifier,
          codeVerifierLength: storedCodeVerifier?.length,
          hasProvider: !!storedProvider,
        });
      }

      // Validate state
      if (returnedState !== storedState) {
        throw new Error('OAuth state mismatch - possible CSRF attack');
      }

      // Build callback request body
      const callbackBody: Record<string, unknown> = {
        provider: storedProvider,
        code,
        redirectUri,
        state: storedState,
        platform: Platform.OS,
        deviceInfo: {
          deviceName: `Expo App`,
        },
      };

      // Only include codeVerifier if we have one (required for mobile PKCE)
      if (storedCodeVerifier) {
        callbackBody.codeVerifier = storedCodeVerifier;
        callbackBody.code_verifier = storedCodeVerifier; // Also send snake_case in case backend expects it
      }

      if (__DEV__) {
        console.log('[OAuth] Sending callback request:', {
          provider: callbackBody.provider,
          hasCode: !!callbackBody.code,
          hasCodeVerifier: !!callbackBody.codeVerifier,
          platform: callbackBody.platform,
        });
      }

      // Step 4: Exchange code for tokens
      const callbackResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callbackBody),
      });

      if (!callbackResponse.ok) {
        const error = await callbackResponse.json().catch(() => ({}));
        throw new Error(error.message || `Failed to exchange code for tokens (${callbackResponse.status})`);
      }

      const { accessToken, refreshToken, user } = await callbackResponse.json();

      // Store tokens and user
      await Promise.all([
        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      // Clean up OAuth state
      await Promise.all([
        storage.deleteItem(STORAGE_KEYS.OAUTH_STATE),
        storage.deleteItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER),
        storage.deleteItem(STORAGE_KEYS.OAUTH_PROVIDER),
      ]);

      safeSetState({
        user,
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
        // Revoke token on server (fire and forget, but log errors in dev)
        fetch(`${VOPIConfig.apiUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch((error) => {
          // Log logout errors in development for debugging
          if (__DEV__) {
            console.warn('[Auth] Logout request failed:', error.message);
          }
        });
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

        const { accessToken, refreshToken: newRefreshToken } = await response.json();

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
      return null;
    }

    // Check if token is expired using safe decoder
    const payload = decodeJWTPayload(accessToken);
    if (payload && typeof payload.exp === 'number') {
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const bufferMs = 60 * 1000; // 1 minute buffer

      if (expiresAt - bufferMs < now) {
        // Token is expired or about to expire, refresh it
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
