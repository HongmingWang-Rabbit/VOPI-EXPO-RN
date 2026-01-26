import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { apiClient } from '../src/services/api.client';
import { WebContainer } from '../src/components/ui/WebContainer';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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

  // Connect API client to auth context
  useEffect(() => {
    apiClient.setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  // Hide splash screen when auth is loaded
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <WebContainer>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ headerShown: true, title: 'Privacy Policy' }} />
        <Stack.Screen name="terms-of-service" options={{ headerShown: true, title: 'Terms of Service' }} />
      </Stack>
      <StatusBar style="auto" />
    </WebContainer>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryClientProvider>
  );
}
