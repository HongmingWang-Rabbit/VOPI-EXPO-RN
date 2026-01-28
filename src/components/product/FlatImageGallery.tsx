import React, { useMemo, useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useWindowDimensions,
  Image,
  ScrollView,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

interface FlatImageGalleryProps {
  commercialImages: Record<string, Record<string, string>>;
}

const isValidImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const THUMBNAIL_SIZE = 56;
const THUMBNAIL_GAP = spacing.sm;

function FlatImageGalleryComponent({ commercialImages }: FlatImageGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const variant of Object.values(commercialImages)) {
      for (const url of Object.values(variant)) {
        urls.push(url);
      }
    }
    return urls;
  }, [commercialImages]);

  const imageWidth = screenWidth - spacing.lg * 2;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleDownload = useCallback(() => {
    if (selectedUrl && isValidImageUrl(selectedUrl)) {
      Linking.openURL(selectedUrl);
    }
  }, [selectedUrl]);

  const handleDismiss = useCallback(() => setSelectedUrl(null), []);

  const handleThumbnailPress = useCallback(
    (index: number) => {
      carouselRef.current?.scrollToIndex({ index, animated: true });
      setActiveIndex(index);
    },
    []
  );

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: imageWidth,
      offset: imageWidth * index,
      index,
    }),
    [imageWidth]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <TouchableOpacity
        style={[styles.imageWrapper, { width: imageWidth, height: imageWidth }]}
        onPress={() => setSelectedUrl(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Product image ${index + 1} of ${imageUrls.length}`}
        accessibilityHint="Tap to view full size"
      >
        <Image
          source={{ uri: item }}
          style={[styles.image, { width: imageWidth, height: imageWidth }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      </TouchableOpacity>
    ),
    [imageWidth, imageUrls.length]
  );

  const keyExtractor = useCallback(
    (item: string, index: number) => `${index}-${item.slice(-20)}`,
    []
  );

  if (imageUrls.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No images available</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={carouselRef}
        data={imageUrls}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.carousel}
        snapToInterval={imageWidth}
        decelerationRate="fast"
      />

      {/* Counter + dots */}
      <View style={styles.indicatorRow}>
        {imageUrls.length > 1 && (
          <>
            <View style={styles.dots}>
              {imageUrls.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
            <Text style={styles.counter}>
              {activeIndex + 1} / {imageUrls.length}
            </Text>
          </>
        )}
      </View>

      {/* Thumbnails */}
      {imageUrls.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {imageUrls.map((url, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleThumbnailPress(i)}
              activeOpacity={0.7}
              style={[
                styles.thumbnail,
                i === activeIndex && styles.thumbnailActive,
              ]}
            >
              <Image
                source={{ uri: url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selectedUrl} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.md }]}>
            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.modalBtn}
              accessibilityRole="button"
              accessibilityLabel="Close full screen image"
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDownload}
              style={styles.modalBtn}
              accessibilityRole="button"
              accessibilityLabel="Download image"
            >
              <Ionicons name="download-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalImageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom
          >
            {selectedUrl && (
              <Image
                source={{ uri: selectedUrl }}
                style={[styles.modalImage, { width: screenWidth, height: screenWidth }]}
                resizeMode="contain"
                accessibilityLabel="Full size product image"
                accessibilityIgnoresInvertColors
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export const FlatImageGallery = memo(FlatImageGalleryComponent);

const styles = StyleSheet.create({
  carousel: {
    paddingHorizontal: spacing.lg,
  },
  imageWrapper: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  counter: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  thumbnailRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: THUMBNAIL_GAP,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textTertiary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  modalBtn: {
    padding: spacing.sm,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    // dimensions applied inline via style prop
  },
});
