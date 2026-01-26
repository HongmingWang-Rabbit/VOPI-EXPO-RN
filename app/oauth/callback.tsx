import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { VOPIConfig } from '../../src/config/vopi.config';
import { storage } from '../../src/utils/storage';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../src/theme';

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
      const storedState = await storage.getItem('oauth_state');
      const storedCodeVerifier = await storage.getItem('oauth_code_verifier');
      const storedProvider = await storage.getItem('oauth_provider');

      // Validate state
      if (state !== storedState) {
        setError('OAuth state mismatch - please try again');
        return;
      }

      // Exchange code for tokens
      const redirectUri = `${VOPIConfig.webUrl}/oauth/callback`;
      const callbackResponse = await fetch(`${VOPIConfig.apiUrl}/api/v1/auth/oauth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: storedProvider,
          code,
          redirectUri,
          state: storedState,
          codeVerifier: storedCodeVerifier || undefined,
          platform: Platform.OS,
          deviceInfo: {
            deviceName: 'Web Browser',
          },
        }),
      });

      if (!callbackResponse.ok) {
        const errorData = await callbackResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to exchange code for tokens');
      }

      const { accessToken, refreshToken, user } = await callbackResponse.json();

      // Store tokens and user
      await Promise.all([
        storage.setItem('vopi_access_token', accessToken),
        storage.setItem('vopi_refresh_token', refreshToken),
        storage.setItem('vopi_user', JSON.stringify(user)),
      ]);

      // Clean up OAuth state
      await Promise.all([
        storage.deleteItem('oauth_state'),
        storage.deleteItem('oauth_code_verifier'),
        storage.deleteItem('oauth_provider'),
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
