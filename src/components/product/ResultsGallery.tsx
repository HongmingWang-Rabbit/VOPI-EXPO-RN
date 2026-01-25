import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';

interface ResultsGalleryProps {
  images: Record<string, Record<string, string>>;
  onImagePress?: (url: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_SIZE = (SCREEN_WIDTH - 48) / 2;

export function ResultsGallery({ images, onImagePress }: ResultsGalleryProps) {
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
                style={styles.imageContainer}
                onPress={() => onImagePress?.(url)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: url }}
                  style={styles.image}
                  resizeMode="cover"
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
    fontSize: 16,
    color: '#888',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  versionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
