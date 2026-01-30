import React, { memo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing, borderRadius } from '../../theme';

function SkeletonResultsPageComponent() {
  const { width } = useWindowDimensions();
  const imageSize = width - spacing.lg * 2;

  return (
    <View style={styles.container}>
      {/* Image placeholder */}
      <View style={styles.imageSection}>
        <Skeleton width={imageSize} height={imageSize} borderRadiusValue={borderRadius.lg} />
      </View>

      {/* Metadata lines */}
      <View style={styles.metadataSection}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="90%" height={18} style={{ marginTop: spacing.md }} />
        <Skeleton width="100%" height={14} style={{ marginTop: spacing.lg }} />
        <Skeleton width="95%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width="60%" height={14} style={{ marginTop: spacing.sm }} />
        <Skeleton width="30%" height={14} style={{ marginTop: spacing.lg }} />
        <Skeleton width="50%" height={18} style={{ marginTop: spacing.md }} />
        <Skeleton width="30%" height={14} style={{ marginTop: spacing.lg }} />
        <Skeleton width="40%" height={18} style={{ marginTop: spacing.md }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  metadataSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});

export const SkeletonResultsPage = memo(SkeletonResultsPageComponent);
