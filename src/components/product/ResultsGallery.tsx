import React, { useMemo, memo } from 'react';
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

function ResultsGalleryComponent({ images, onImagePress, productName }: ResultsGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const imageSize = (screenWidth - 48) / 2;

  // Memoize processed image data to avoid recalculating on each render
  const { variants, totalImages, imagesByVariant } = useMemo(() => {
    const variantKeys = Object.keys(images);
    const total = variantKeys.reduce((sum, v) => sum + Object.keys(images[v]).length, 0);
    const byVariant = variantKeys.map((variant) => ({
      variant,
      images: Object.entries(images[variant]),
    }));
    return { variants: variantKeys, totalImages: total, imagesByVariant: byVariant };
  }, [images]);

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
      {imagesByVariant.map(({ variant, images: variantImages }) => (
        <View key={variant} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {capitalizeFirst(variant)}
          </Text>

          <View style={styles.grid} accessibilityRole="list">
            {variantImages.map(([version, url]) => (
              <TouchableOpacity
                key={version}
                style={[styles.imageContainer, { width: imageSize }]}
                onPress={() => onImagePress?.(url)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${productName ? productName + ' - ' : ''}${capitalizeFirst(variant)} style, ${capitalizeFirst(version)} version. Image ${variantImages.indexOf([version, url]) + 1} of ${variantImages.length} in this category.`}
                accessibilityHint="Double tap to view full size image"
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.image, { width: imageSize, height: imageSize }]}
                  resizeMode="cover"
                  accessibilityLabel={`${productName ? productName + ': ' : 'Product image: '}${capitalizeFirst(variant)} ${capitalizeFirst(version)}`}
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

export const ResultsGallery = memo(ResultsGalleryComponent);

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
