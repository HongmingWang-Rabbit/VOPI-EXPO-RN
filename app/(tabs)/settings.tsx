import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { useConnections } from '../../src/hooks/useConnections';
import { vopiService } from '../../src/services/vopi.service';
import { getCheckoutUrls } from '../../src/config/vopi.config';
import { PlatformConnection } from '../../src/types/vopi.types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { balance, packs, refresh } = useCredits();
  const { shopifyConnections, loading: connectionsLoading, refresh: refreshConnections } = useConnections();
  const isCheckoutInProgressRef = useRef(false);
  const [showShopInput, setShowShopInput] = useState(false);
  const [shopDomain, setShopDomain] = useState('');
  const [connecting, setConnecting] = useState(false);

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

  const handleConnectShopify = async () => {
    const storeName = shopDomain.trim().toLowerCase().replace(/\.myshopify\.com$/, '');
    if (!storeName) return;
    const shop = `${storeName}.myshopify.com`;
    let subscription: ReturnType<typeof AppState.addEventListener> | null = null;
    try {
      setConnecting(true);
      const authUrl = await vopiService.getShopifyAuthUrl(shop);

      subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          subscription?.remove();
          subscription = null;
          refreshConnections();
        }
      });

      await WebBrowser.openBrowserAsync(authUrl);
      setShowShopInput(false);
      setShopDomain('');
      refreshConnections();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Failed', message);
    } finally {
      subscription?.remove();
      setConnecting(false);
    }
  };

  const handleDisconnect = (connection: PlatformConnection) => {
    const shopName = (connection.metadata?.shopName as string) || connection.platformAccountId;
    Alert.alert(
      'Disconnect Store',
      `Are you sure you want to disconnect ${shopName}?`,
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

        {/* Connected Platforms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Platforms</Text>
          {connectionsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {shopifyConnections.map((conn) => {
                const shopName = String(conn.metadata?.shopName ?? conn.platformAccountId);
                return (
                  <View key={conn.id} style={styles.connectionCard}>
                    <View style={styles.connectionInfo}>
                      <Text style={styles.connectionName}>{shopName}</Text>
                      <View style={styles.connectionMeta}>
                        <View
                          style={[
                            styles.statusBadge,
                            conn.status === 'active'
                              ? styles.statusActive
                              : styles.statusInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              conn.status === 'active'
                                ? styles.statusTextActive
                                : styles.statusTextInactive,
                            ]}
                          >
                            {conn.status}
                          </Text>
                        </View>
                      </View>
                      {conn.lastError && (
                        <Text style={styles.connectionError} numberOfLines={2}>
                          {conn.lastError}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDisconnect(conn)}
                      accessibilityRole="button"
                      accessibilityLabel={`Disconnect ${shopName}`}
                    >
                      <Ionicons name="close-circle-outline" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              {showShopInput ? (
                <View style={styles.shopInputContainer}>
                  <Text style={styles.shopInputLabel}>Store name</Text>
                  <View style={styles.shopInputRow}>
                    <TextInput
                      style={styles.shopInput}
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
                    <Text style={styles.shopInputSuffix}>.myshopify.com</Text>
                  </View>
                  <View style={styles.shopInputButtons}>
                    <TouchableOpacity
                      style={styles.shopInputCancel}
                      onPress={() => { setShowShopInput(false); setShopDomain(''); }}
                      disabled={connecting}
                    >
                      <Text style={styles.shopInputCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.shopInputConnect, !shopDomain.trim() && styles.shopInputConnectDisabled]}
                      onPress={handleConnectShopify}
                      disabled={!shopDomain.trim() || connecting}
                      accessibilityRole="button"
                    >
                      {connecting ? (
                        <ActivityIndicator size="small" color={colors.white} />
                      ) : (
                        <Text style={styles.shopInputConnectText}>Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.connectButton}
                  onPress={() => setShowShopInput(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Connect Shopify store"
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.connectButtonText}>Connect Shopify</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
  connectionCard: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  connectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.warningLight,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.warning,
  },
  connectionError: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundTertiary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  connectButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  shopInputContainer: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  shopInputLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopInputSuffix: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  shopInputConnect: {
    backgroundColor: colors.primary,
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
    color: colors.white,
    fontWeight: fontWeight.semibold,
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
