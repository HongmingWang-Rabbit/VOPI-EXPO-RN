import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useProcessingJobs } from '../../src/hooks/useProcessingJobs';
import { storage } from '../../src/utils/storage';
import { STORAGE_KEYS } from '../../src/constants/storage';

export default function TabLayout() {
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const processingCount = useProcessingJobs();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED).then((value) => {
      setNeedsOnboarding(value !== 'true');
      setOnboardingChecked(true);
    }).catch(() => {
      // Storage failed — skip onboarding gate to avoid blocking the user
      setOnboardingChecked(true);
    });
  }, []);

  // If user is not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Show onboarding for new users
  if (onboardingChecked && needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
          tabBarBadge: processingCount > 0 ? processingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
