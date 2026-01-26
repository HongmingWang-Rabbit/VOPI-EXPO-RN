import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { VOPIConfig } from '../../src/config/vopi.config';
import { storage } from '../../src/utils/storage';
import { STORAGE_KEYS } from '../../src/constants/storage';
import { colors, spacing, fontSize, fontWeight } from '../../src/theme';

/**
 * OAuth callback page for web
 * Handles the redirect from Google/Apple OAuth and exchanges the code for tokens
 */
export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleOAuthCallback = useCallback(async () => {
    try {
      const code = params.code as string;
      const state = params.state as string;
      const errorParam = params.error as string;

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      // Retrieve stored OAuth state
      const storedState = await storage.getItem(STORAGE_KEYS.OAUTH_STATE);
      const storedCodeVerifier = await storage.getItem(STORAGE_KEYS.OAUTH_CODE_VERIFIER);
      const storedProvider = await storage.getItem(STORAGE_KEYS.OAUTH_PROVIDER);

      // Validate state - must exist and match
      if (!storedState || !state || state !== storedState) {
        setError('OAuth state mismatch - CSRF protection failed. Please try again.');
        return;
      }

      // Validate provider exists
      if (!storedProvider) {
        setError('OAuth session expired - please try again');
        return;
      }

      // Build callback request body
      const redirectUri = `${VOPIConfig.webUrl}/oauth/callback`;
      const callbackBody: Record<string, unknown> = {
        provider: storedProvider,
        code,
        redirectUri,
        state: storedState,
        platform: Platform.OS,
        deviceInfo: {
          deviceName: 'Web Browser',
        },
      };

      // Include codeVerifier if available (for PKCE flow)
      if (storedCodeVerifier) {
        callbackBody.codeVerifier = storedCodeVerifier;
        callbackBody.code_verifier = storedCodeVerifier; // Also send snake_case for backend compatibility
      }

      // Exchange code for tokens
      const callbackResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callbackBody),
      });

      if (!callbackResponse.ok) {
        const errorData = await callbackResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to exchange code for tokens');
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

      // Redirect to home - force page reload to update auth state
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [params.code, params.state, params.error]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // This page is only for web
      router.replace('/');
      return;
    }

    handleOAuthCallback();
  }, [handleOAuthCallback, router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Authentication Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text
          style={styles.link}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="link"
        >
          Back to Login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.xl,
  },
  text: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  link: {
    fontSize: fontSize.md,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
