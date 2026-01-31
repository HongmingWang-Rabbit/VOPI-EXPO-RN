import { useEffect, useLayoutEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { apiClient } from '../src/services/api.client';
import { WebContainer } from '../src/components/ui/WebContainer';
import { ErrorBoundary } from '../src/components/ui/ErrorBoundary';
import { initSentry } from '../src/services/sentry';
import { requestNotificationPermissions } from '../src/services/notifications';

// Initialize Sentry for error tracking
initSentry();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors - splash screen may not be available
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { isLoading, getAccessToken } = useAuth();
  const { colors, isDark } = useTheme();

  // Connect API client to auth context - use useLayoutEffect to ensure
  // token getter is set before any children render and make API calls
  useLayoutEffect(() => {
    apiClient.setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  // Hide splash screen when auth is loaded and request notification permissions
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
      requestNotificationPermissions().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <WebContainer>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="video-preview" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="results" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy Policy' }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: true, title: 'Terms of Service' }} />
        <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </WebContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ToastProvider>
                <RootLayoutNav />
              </ToastProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
