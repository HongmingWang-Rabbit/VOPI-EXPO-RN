import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { VOPIConfig, getRedirectUri } from '../config/vopi.config';
import { User } from '../types/vopi.types';
import { storage } from '../utils/storage';

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

// Secure storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vopi_access_token',
  REFRESH_TOKEN: 'vopi_refresh_token',
  USER: 'vopi_user',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<string | null> | null>(null);

  // Load stored user on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [accessToken, userJson] = await Promise.all([
        storage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        storage.getItem(STORAGE_KEYS.USER),
      ]);

      if (accessToken && userJson) {
        const user = JSON.parse(userJson) as User;

        // Verify token is still valid by fetching fresh user data
        try {
          const freshUser = await fetchUserProfile(accessToken);
          setState({
            user: freshUser,
            isLoading: false,
            isAuthenticated: true,
          });
          await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
        } catch {
          // Token might be expired, try refresh
          const newToken = await refreshAccessToken();
          if (newToken) {
            const freshUser = await fetchUserProfile(newToken);
            setState({
              user: freshUser,
              isLoading: false,
              isAuthenticated: true,
            });
          } else {
            // Refresh failed, clear auth
            await clearAuth();
            setState({ user: null, isLoading: false, isAuthenticated: false });
          }
        }
      } else {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      setState({ user: null, isLoading: false, isAuthenticated: false });
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

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const redirectUri = getRedirectUri();
      console.log('[Auth] Starting OAuth with provider:', provider);
      console.log('[Auth] Redirect URI:', redirectUri);
      console.log('[Auth] API URL:', VOPIConfig.apiUrl);

      // Step 1: Initialize OAuth
      const initResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, redirectUri }),
      });

      if (!initResponse.ok) {
        const errorData = await initResponse.json().catch(() => ({}));
        console.error('[Auth] OAuth init failed:', initResponse.status, errorData);
        throw new Error(errorData.message || `Failed to initialize OAuth (${initResponse.status})`);
      }

      const { authorizationUrl, state: oauthState, codeVerifier } = await initResponse.json();
      console.log('[Auth] Got authorization URL, opening browser...');

      // Store OAuth state temporarily
      await storage.setItem('oauth_state', oauthState);
      await storage.setItem('oauth_code_verifier', codeVerifier || '');
      await storage.setItem('oauth_provider', provider);

      // Step 2: Open browser for OAuth
      const result = await WebBrowser.openAuthSessionAsync(
        authorizationUrl,
        redirectUri
      );

      console.log('[Auth] Browser result type:', result.type);

      if (result.type !== 'success' || !result.url) {
        console.log('[Auth] OAuth cancelled or failed:', result.type);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      console.log('[Auth] Got redirect URL:', result.url);

      // Step 3: Extract code from redirect URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Retrieve stored OAuth state
      const storedState = await storage.getItem('oauth_state');
      const storedCodeVerifier = await storage.getItem('oauth_code_verifier');
      const storedProvider = await storage.getItem('oauth_provider');

      // Validate state
      if (returnedState !== storedState) {
        throw new Error('OAuth state mismatch - possible CSRF attack');
      }

      // Step 4: Exchange code for tokens
      console.log('[Auth] Exchanging code for tokens...');
      const callbackResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: storedProvider,
          code,
          redirectUri,
          state: storedState,
          codeVerifier: storedCodeVerifier || undefined,
          deviceInfo: {
            deviceName: `Expo App`,
          },
        }),
      });

      if (!callbackResponse.ok) {
        const error = await callbackResponse.json().catch(() => ({}));
        console.error('[Auth] Token exchange failed:', callbackResponse.status, error);
        throw new Error(error.message || `Failed to exchange code for tokens (${callbackResponse.status})`);
      }

      console.log('[Auth] Token exchange successful');

      const { accessToken, refreshToken, user } = await callbackResponse.json();

      // Store tokens and user
      await Promise.all([
        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
        storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)),
      ]);

      // Clean up OAuth state
      await Promise.all([
        storage.deleteItem('oauth_state'),
        storage.deleteItem('oauth_code_verifier'),
        storage.deleteItem('oauth_provider'),
      ]);

      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signInWithGoogle = useCallback(() => signInWithProvider('google'), []);
  const signInWithApple = useCallback(() => signInWithProvider('apple'), []);

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (refreshToken) {
        // Revoke token on server
        await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.warn('Failed to revoke token:', error);
    } finally {
      await clearAuth();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const clearAuth = async () => {
    await Promise.all([
      storage.deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
      storage.deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
      storage.deleteItem(STORAGE_KEYS.USER),
    ]);
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    // Prevent concurrent refresh requests
    if (isRefreshing.current) {
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
      } catch (error) {
        console.error('Token refresh failed:', error);
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

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const bufferMs = 60 * 1000; // 1 minute buffer

      if (expiresAt - bufferMs < now) {
        // Token is expired or about to expire, refresh it
        return await refreshAccessToken();
      }

      return accessToken;
    } catch {
      // If we can't decode the token, try to refresh
      return await refreshAccessToken();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (accessToken) {
      const freshUser = await fetchUserProfile(accessToken);
      setState(prev => ({ ...prev, user: freshUser }));
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    }
  }, [getAccessToken]);

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
