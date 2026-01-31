import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlatformConnection } from '../../types/vopi.types';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme';

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
  const { colors } = useTheme();
  const { platform, name, extra } = getDisplayInfo(connection);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundTertiary }]}>
      <View style={styles.info}>
        <Text style={[styles.platform, { color: colors.textSecondary }]}>{platform}</Text>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <View style={styles.meta}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: connection.status === 'active' ? colors.successLight : colors.warningLight },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: connection.status === 'active' ? colors.success : colors.warning },
              ]}
            >
              {connection.status}
            </Text>
          </View>
          {extra && <Text style={[styles.extra, { color: colors.textSecondary }]}>{extra}</Text>}
        </View>
        {connection.lastError && (
          <Text style={[styles.error, { color: colors.error }]} numberOfLines={2}>
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
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
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
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  extra: {
    fontSize: fontSize.xs,
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: fontSize.xs,
    marginTop: 4,
  },
});
