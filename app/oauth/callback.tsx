import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { VOPIConfig } from '../../src/config/vopi.config';
import { storage } from '../../src/utils/storage';

/**
 * OAuth callback page for web
 * Handles the redirect from Google/Apple OAuth and exchanges the code for tokens
 */
export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // This page is only for web
      router.replace('/');
      return;
    }

    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
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
      console.error('OAuth callback error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Authentication Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text
          style={styles.link}
          onPress={() => router.replace('/(auth)/login')}
        >
          Back to Login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
