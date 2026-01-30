import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Skeleton } from './Skeleton';
import { spacing, borderRadius, shadows } from '../../theme';

function SkeletonProductCardComponent() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.background }, shadows.md]}>
      <Skeleton width={80} height={80} borderRadiusValue={borderRadius.md} />
      <View style={styles.body}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="50%" height={12} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

export const SkeletonProductCard = memo(SkeletonProductCardComponent);
