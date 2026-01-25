import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { vopiService } from '../../src/services/vopi.service';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { balance, packs, refresh } = useCredits();

  const handlePurchaseCredits = async (packType: string) => {
    try {
      const { checkoutUrl } = await vopiService.createCheckout(
        packType,
        'vopi://purchase/success',
        'vopi://purchase/cancel'
      );
      await WebBrowser.openBrowserAsync(checkoutUrl);
      // Refresh credits after returning from checkout
      setTimeout(refresh, 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to start checkout');
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
        <Text style={styles.headerTitle}>Settings</Text>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>VOPI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  balanceLabel: {
    fontSize: 16,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  packCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  packCredits: {
    fontSize: 14,
    color: '#666',
  },
  packPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    padding: 24,
  },
});
