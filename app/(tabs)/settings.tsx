import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { useConnections } from '../../src/hooks/useConnections';
import { useTheme } from '../../src/contexts/ThemeContext';
import { haptics } from '../../src/utils/haptics';
import { vopiService } from '../../src/services/vopi.service';
import { getCheckoutUrls } from '../../src/config/vopi.config';
import { PlatformConnection } from '../../src/types/vopi.types';
import { ConnectionCard } from '../../src/components/platform/ConnectionCard';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Opens an OAuth URL in the browser and refreshes connections when the app returns to foreground. */
async function openOAuthFlow(
  getAuthUrl: () => Promise<string>,
  onRefresh: () => void,
): Promise<void> {
  let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
  try {
    const authUrl = await getAuthUrl();

    subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        subscription?.remove();
        subscription = null;
        onRefresh();
      }
    });

    await WebBrowser.openBrowserAsync(authUrl);
    onRefresh();
  } finally {
    subscription?.remove();
  }
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { balance, packs, refresh } = useCredits();
  const { shopifyConnections, amazonConnections, loading: connectionsLoading, refresh: refreshConnections } = useConnections();
  const { colors, themeMode, setThemeMode } = useTheme();
  const isCheckoutInProgressRef = useRef(false);
  const [showShopSheet, setShowShopSheet] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectingAmazon, setConnectingAmazon] = useState(false);

  // Refresh credits when app returns to foreground after checkout
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'active' && isCheckoutInProgressRef.current) {
      isCheckoutInProgressRef.current = false;
      // Refresh credits when returning from checkout
      refresh();
    }
  }, [refresh]);

  const handlePurchaseCredits = async (packType: string) => {
    haptics.light();
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

  const handleConnectShopify = async () => {
    const storeName = shopDomain.trim().toLowerCase().replace(/\.myshopify\.com$/, '');
    if (!storeName) return;
    const shop = `${storeName}.myshopify.com`;
    try {
      setConnecting(true);
      await openOAuthFlow(() => vopiService.getShopifyAuthUrl(shop), refreshConnections);
      setShowShopSheet(false);
      setShopDomain('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Failed', message);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectAmazon = async () => {
    haptics.light();
    try {
      setConnectingAmazon(true);
      await openOAuthFlow(() => vopiService.getAmazonAuthUrl(), refreshConnections);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Failed', message);
    } finally {
      setConnectingAmazon(false);
    }
  };

  const handleDisconnect = useCallback((connection: PlatformConnection) => {
    haptics.light();
    const platformLabel = connection.platform === 'amazon' ? 'Account' : 'Store';
    const displayName = connection.platform === 'amazon'
      ? String(connection.metadata?.sellerId ?? connection.platformAccountId)
      : String(connection.metadata?.shopName ?? connection.platformAccountId);
    Alert.alert(
      `Disconnect ${platformLabel}`,
      `Are you sure you want to disconnect ${displayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await vopiService.disconnectConnection(connection.id);
              refreshConnections();
            } catch {
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            }
          },
        },
      ]
    );
  }, [refreshConnections]);

  const handleSignOut = () => {
    haptics.light();
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const themeModes: Array<{ key: 'system' | 'light' | 'dark'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
    { key: 'light', label: 'Light', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.name || 'User'}</Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {themeModes.map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={[
                  styles.themeOption,
                  { borderColor: themeMode === mode.key ? colors.primary : colors.border, backgroundColor: colors.background },
                ]}
                onPress={() => { haptics.selection(); setThemeMode(mode.key); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: themeMode === mode.key }}
                accessibilityLabel={`${mode.label} theme`}
              >
                <Ionicons name={mode.icon} size={20} color={themeMode === mode.key ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeLabel, { color: themeMode === mode.key ? colors.primary : colors.textSecondary }]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Credits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Credits</Text>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.text }]}>Current Balance</Text>
              <Text style={[styles.balanceValue, { color: colors.primary }]}>{balance} credits</Text>
            </View>
          </View>
        </View>

        {/* Credit Packs */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Purchase Credits</Text>
          {packs.map((pack) => (
            <TouchableOpacity
              key={pack.packType}
              style={[styles.packCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => handlePurchaseCredits(pack.packType)}
              accessibilityRole="button"
              accessibilityLabel={`Purchase ${pack.name} for $${pack.priceUsd.toFixed(2)}`}
            >
              <View>
                <Text style={[styles.packName, { color: colors.text }]}>{pack.name}</Text>
                <Text style={[styles.packCredits, { color: colors.textSecondary }]}>{pack.credits} credits</Text>
              </View>
              <Text style={[styles.packPrice, { color: colors.success }]}>${pack.priceUsd.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Connected Platforms */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Connected Platforms</Text>
          {connectionsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {/* Shopify Connections */}
              {shopifyConnections.map((conn) => (
                <ConnectionCard key={conn.id} connection={conn} onDisconnect={handleDisconnect} />
              ))}
              <TouchableOpacity
                style={[styles.connectButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => { haptics.light(); setShowShopSheet(true); }}
                accessibilityRole="button"
                accessibilityLabel="Connect Shopify store"
              >
                <Ionicons name="storefront-outline" size={20} color={colors.primary} />
                <Text style={[styles.connectButtonText, { color: colors.primary }]}>Connect Shopify</Text>
              </TouchableOpacity>

              {/* Amazon Connections */}
              {amazonConnections.map((conn) => (
                <ConnectionCard key={conn.id} connection={conn} onDisconnect={handleDisconnect} />
              ))}
              <TouchableOpacity
                style={[styles.connectButton, styles.connectButtonSpaced, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleConnectAmazon}
                disabled={connectingAmazon}
                accessibilityRole="button"
                accessibilityLabel="Connect Amazon seller account"
              >
                {connectingAmazon ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="logo-amazon" size={20} color={colors.primary} />
                    <Text style={[styles.connectButtonText, { color: colors.primary }]}>Connect Amazon</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.errorLight }]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out of your account"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>VOPI v{APP_VERSION}</Text>
      </ScrollView>

      {/* Shopify Connect Bottom Sheet */}
      <BottomSheet visible={showShopSheet} onDismiss={() => { setShowShopSheet(false); setShopDomain(''); }}>
        <Text style={[styles.shopSheetTitle, { color: colors.text }]}>Connect Shopify Store</Text>
        <Text style={[styles.shopInputLabel, { color: colors.textSecondary }]}>Store name</Text>
        <View style={styles.shopInputRow}>
          <TextInput
            style={[styles.shopInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="mystore"
            placeholderTextColor={colors.textTertiary}
            value={shopDomain}
            onChangeText={setShopDomain}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!connecting}
            autoFocus
          />
          <Text style={[styles.shopInputSuffix, { color: colors.textSecondary }]}>.myshopify.com</Text>
        </View>
        <View style={styles.shopInputButtons}>
          <TouchableOpacity
            style={styles.shopInputCancel}
            onPress={() => { setShowShopSheet(false); setShopDomain(''); }}
            disabled={connecting}
          >
            <Text style={[styles.shopInputCancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shopInputConnect, { backgroundColor: colors.primary }, !shopDomain.trim() && styles.shopInputConnectDisabled]}
            onPress={handleConnectShopify}
            disabled={!shopDomain.trim() || connecting}
            accessibilityRole="button"
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.shopInputConnectText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
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
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.xs,
  },
  themeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: fontSize.md,
  },
  balanceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  packCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    ...shadows.sm,
  },
  packName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  packCredits: {
    fontSize: fontSize.sm,
  },
  packPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    borderWidth: 1,
  },
  connectButtonSpaced: {
    marginTop: spacing.sm,
  },
  connectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    padding: spacing.xl,
  },
  shopSheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.lg,
  },
  shopInputLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  shopInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shopInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  shopInputSuffix: {
    fontSize: fontSize.md,
    marginLeft: spacing.sm,
  },
  shopInputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  shopInputCancel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  shopInputCancelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  shopInputConnect: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  shopInputConnectDisabled: {
    opacity: 0.5,
  },
  shopInputConnectText: {
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    fontWeight: fontWeight.semibold,
  },
});
