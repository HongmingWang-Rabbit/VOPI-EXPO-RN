import React, { useMemo, useState, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  ViewToken,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import { toCacheKey } from '../../utils/strings';

interface ImageEntry {
  url: string;
  frameId: string;
  version: string;
}

interface FlatImageGalleryProps {
  commercialImages: Record<string, Record<string, string>>;
  jobId: string;
  onDeleteImage?: (frameId: string, version: string) => Promise<void>;
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
const MAX_DOTS = 7;

function FlatImageGalleryComponent({ commercialImages, jobId, onDeleteImage }: FlatImageGalleryProps) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedEntry, setSelectedEntry] = useState<ImageEntry | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [deletedUrls, setDeletedUrls] = useState<Set<string>>(new Set());
  const carouselRef = useRef<FlatList>(null);

  const imageEntries = useMemo(() => {
    const entries: ImageEntry[] = [];
    for (const [frameId, variants] of Object.entries(commercialImages)) {
      for (const [version, url] of Object.entries(variants)) {
        if (!deletedUrls.has(url)) {
          entries.push({ url, frameId, version });
        }
      }
    }
    return entries;
  }, [commercialImages, deletedUrls]);

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
    if (selectedEntry && isValidImageUrl(selectedEntry.url)) {
      Linking.openURL(selectedEntry.url);
    }
  }, [selectedEntry]);

  const handleDismiss = useCallback(() => setSelectedEntry(null), []);

  const handleDelete = useCallback(() => {
    if (!selectedEntry || !onDeleteImage) return;

    const { frameId, version, url } = selectedEntry;
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingUrl(url);
          try {
            await onDeleteImage(frameId, version);
            setDeletedUrls((prev) => new Set(prev).add(url));
            setSelectedEntry(null);
            // Adjust activeIndex if needed
            setActiveIndex((prev) => Math.min(prev, Math.max(0, imageEntries.length - 2)));
          } catch (err) {
            Alert.alert('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
          } finally {
            setDeletingUrl(null);
          }
        },
      },
    ]);
  }, [selectedEntry, onDeleteImage, imageEntries.length]);

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
    ({ item, index }: { item: ImageEntry; index: number }) => (
      <TouchableOpacity
        style={[styles.imageWrapper, { width: imageWidth, height: imageWidth }]}
        onPress={() => setSelectedEntry(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Product image ${index + 1} of ${imageEntries.length}`}
        accessibilityHint="Tap to view full size"
      >
        <Image
          source={{ uri: item.url, cacheKey: toCacheKey(item.url) }}
          style={[styles.image, { width: imageWidth, height: imageWidth }]}
          contentFit="cover"
          cachePolicy="disk"
        />
      </TouchableOpacity>
    ),
    [imageWidth, imageEntries.length]
  );

  const keyExtractor = useCallback(
    (item: ImageEntry) => `${item.frameId}-${item.version}`,
    []
  );

  if (imageEntries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No images available</Text>
      </View>
    );
  }

  const isDeleting = !!deletingUrl;

  return (
    <View>
      <FlatList
        ref={carouselRef}
        data={imageEntries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        horizontal
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.carousel}
        snapToInterval={imageWidth}
        decelerationRate="fast"
      />

      {/* Counter + dots */}
      <View style={styles.indicatorRow}>
        {imageEntries.length > 1 && (
          <>
            {imageEntries.length <= MAX_DOTS && (
              <View style={styles.dots}>
                {imageEntries.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === activeIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
            <Text style={styles.counter}>
              {activeIndex + 1} / {imageEntries.length}
            </Text>
          </>
        )}
      </View>

      {/* Thumbnails */}
      {imageEntries.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailRow}
        >
          {imageEntries.map((entry, i) => (
            <TouchableOpacity
              key={`${entry.frameId}-${entry.version}`}
              onPress={() => handleThumbnailPress(i)}
              activeOpacity={0.7}
              style={[
                styles.thumbnail,
                i === activeIndex && styles.thumbnailActive,
              ]}
            >
              <Image
                source={{ uri: entry.url, cacheKey: toCacheKey(entry.url) }}
                style={styles.thumbnailImage}
                contentFit="cover"
                cachePolicy="disk"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selectedEntry} transparent animationType="fade">
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

            <View style={styles.modalActions}>
              {onDeleteImage && (
                <TouchableOpacity
                  onPress={handleDelete}
                  style={styles.modalBtn}
                  disabled={isDeleting}
                  accessibilityRole="button"
                  accessibilityLabel="Delete image"
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDownload}
                style={styles.modalBtn}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Download image"
              >
                <Ionicons name="download-outline" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalImageContainer}
            maximumZoomScale={3}
            minimumZoomScale={1}
            bouncesZoom
          >
            {selectedEntry && (
              <Image
                source={{ uri: selectedEntry.url, cacheKey: toCacheKey(selectedEntry.url) }}
                style={[styles.modalImage, { width: screenWidth, height: screenWidth }]}
                contentFit="contain"
                cachePolicy="disk"
                accessibilityLabel="Full size product image"
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
    gap: spacing.sm,
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
