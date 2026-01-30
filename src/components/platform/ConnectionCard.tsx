import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlatformConnection } from '../../types/vopi.types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface ConnectionCardProps {
  connection: PlatformConnection;
  onDisconnect: (connection: PlatformConnection) => void;
}

function getDisplayInfo(connection: PlatformConnection): { platform: string; name: string; extra?: string } {
  switch (connection.platform) {
    case 'amazon':
      return {
        platform: 'Amazon',
        name: String(connection.metadata?.sellerId ?? connection.platformAccountId),
        extra: connection.metadata?.marketplace as string | undefined,
      };
    case 'shopify':
      return {
        platform: 'Shopify',
        name: String(connection.metadata?.shopName ?? connection.platformAccountId),
      };
    case 'ebay':
      return {
        platform: 'eBay',
        name: String(connection.metadata?.username ?? connection.platformAccountId),
      };
    default:
      return {
        platform: connection.platform,
        name: connection.platformAccountId,
      };
  }
}

export const ConnectionCard = memo(function ConnectionCard({ connection, onDisconnect }: ConnectionCardProps) {
  const { platform, name, extra } = getDisplayInfo(connection);

  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.platform}>{platform}</Text>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.meta}>
          <View
            style={[
              styles.statusBadge,
              connection.status === 'active' ? styles.statusActive : styles.statusInactive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                connection.status === 'active' ? styles.statusTextActive : styles.statusTextInactive,
              ]}
            >
              {connection.status}
            </Text>
          </View>
          {extra && <Text style={styles.extra}>{extra}</Text>}
        </View>
        {connection.lastError && (
          <Text style={styles.error} numberOfLines={2}>
            {connection.lastError}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => onDisconnect(connection)}
        accessibilityRole="button"
        accessibilityLabel={`Disconnect ${name}`}
      >
        <Ionicons name="close-circle-outline" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  info: {
    flex: 1,
  },
  platform: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
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
  extra: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
  },
});
