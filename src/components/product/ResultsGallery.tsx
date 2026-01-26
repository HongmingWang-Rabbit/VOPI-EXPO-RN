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

interface ResultsGalleryProps {
  images: Record<string, Record<string, string>>;
  onImagePress?: (url: string) => void;
}

export function ResultsGallery({ images, onImagePress }: ResultsGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const imageSize = (screenWidth - 48) / 2;

  const variants = Object.keys(images);

  if (variants.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No results available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {variants.map((variant) => (
        <View key={variant} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Text>

          <View style={styles.grid}>
            {Object.entries(images[variant]).map(([version, url]) => (
              <TouchableOpacity
                key={version}
                style={[styles.imageContainer, { width: imageSize }]}
                onPress={() => onImagePress?.(url)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View ${variant} ${version} image`}
              >
                <Image
                  source={{ uri: url }}
                  style={[styles.image, { width: imageSize, height: imageSize }]}
                  resizeMode="cover"
                  accessibilityLabel={`${variant} ${version} product image`}
                />
                <Text style={styles.versionLabel}>
                  {version.charAt(0).toUpperCase() + version.slice(1)}
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
