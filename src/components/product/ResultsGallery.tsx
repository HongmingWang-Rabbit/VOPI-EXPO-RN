import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';
import { capitalizeFirst } from '../../utils/strings';

interface ResultsGalleryProps {
  images: Record<string, Record<string, string>>;
  onImagePress?: (url: string) => void;
  productName?: string;
}

export function ResultsGallery({ images, onImagePress, productName }: ResultsGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const imageSize = (screenWidth - 48) / 2;

  const variants = Object.keys(images);
  const totalImages = variants.reduce((sum, v) => sum + Object.keys(images[v]).length, 0);

  if (variants.length === 0) {
    return (
      <View style={styles.empty} accessibilityRole="text">
        <Text style={styles.emptyText}>No results available</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={`Product image gallery with ${totalImages} images in ${variants.length} categories`}
    >
      {variants.map((variant, variantIndex) => (
        <View key={variant} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {capitalizeFirst(variant)}
          </Text>

          <View style={styles.grid} accessibilityRole="list">
            {Object.entries(images[variant]).map(([version, url], imageIndex) => (
              <TouchableOpacity
                key={version}
                style={[styles.imageContainer, { width: imageSize }]}
                onPress={() => onImagePress?.(url)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${productName ? productName + ', ' : ''}${capitalizeFirst(variant)} style, ${capitalizeFirst(version)} version. Tap to view full size.`}
                accessibilityHint="Opens the image in full screen"
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.image, { width: imageSize, height: imageSize }]}
                  resizeMode="cover"
                  accessibilityLabel={`Product image: ${capitalizeFirst(variant)} ${capitalizeFirst(version)}`}
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.versionLabel}>
                  {capitalizeFirst(version)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textTertiary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  imageContainer: {
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  image: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  versionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
