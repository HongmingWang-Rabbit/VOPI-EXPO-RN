import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { vopiService } from '../../src/services/vopi.service';
import { getCheckoutUrls } from '../../src/config/vopi.config';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { balance, packs, refresh } = useCredits();
  const isCheckoutInProgressRef = useRef(false);

  // Refresh credits when app returns to foreground after checkout
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'active' && isCheckoutInProgressRef.current) {
      isCheckoutInProgressRef.current = false;
      // Refresh credits when returning from checkout
      refresh();
    }
  }, [refresh]);

  const handlePurchaseCredits = async (packType: string) => {
    try {
      const checkoutUrls = getCheckoutUrls();
      const { checkoutUrl } = await vopiService.createCheckout(
        packType,
        checkoutUrls.success,
        checkoutUrls.cancel
      );

      // Track that checkout is in progress
      isCheckoutInProgressRef.current = true;

      // Listen for app state changes
      const subscription = AppState.addEventListener('change', handleAppStateChange);

      await WebBrowser.openBrowserAsync(checkoutUrl);

      // Clean up listener and refresh credits
      subscription.remove();
      isCheckoutInProgressRef.current = false;
      refresh();
    } catch {
      isCheckoutInProgressRef.current = false;
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>
          <View style={styles.card}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceValue}>{balance} credits</Text>
            </View>
          </View>
        </View>

        {/* Credit Packs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase Credits</Text>
          {packs.map((pack) => (
            <TouchableOpacity
              key={pack.packType}
              style={styles.packCard}
              onPress={() => handlePurchaseCredits(pack.packType)}
              accessibilityRole="button"
              accessibilityLabel={`Purchase ${pack.name} for $${pack.priceUsd.toFixed(2)}`}
            >
              <View>
                <Text style={styles.packName}>{pack.name}</Text>
                <Text style={styles.packCredits}>{pack.credits} credits</Text>
              </View>
              <Text style={styles.packPrice}>${pack.priceUsd.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>VOPI v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  balanceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  packCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  packName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
    color: colors.text,
  },
  packCredits: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  packPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    padding: spacing.xl,
  },
});
