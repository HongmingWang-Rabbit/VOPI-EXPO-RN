import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { VOPIConfig } from '../../src/config/vopi.config';
import { useTheme } from '../../src/contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../src/theme';
import {
  validateOAuthState,
  exchangeOAuthCode,
  storeOAuthTokens,
  cleanupOAuthState,
} from '../../src/utils/oauth';

/**
 * OAuth callback page for web
 * Handles the redirect from Google/Apple OAuth and exchanges the code for tokens
 */
export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
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

      // Validate OAuth state
      const validation = await validateOAuthState(state);
      if (!validation.isValid) {
        setError(validation.error || 'OAuth validation failed');
        return;
      }

      // Exchange code for tokens
      const redirectUri = `${VOPIConfig.webUrl}/oauth/callback`;
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

      // Redirect to home - AuthProvider will detect the stored tokens
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [params.code, params.state, params.error, router]);

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>Authentication Failed</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{error}</Text>
        <Text
          style={[styles.link, { color: colors.primary }]}
          onPress={() => router.replace('/(auth)/login')}
          accessibilityRole="link"
        >
          Back to Login
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  text: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  link: {
    fontSize: fontSize.md,
    textDecorationLine: 'underline',
  },
});
