import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { vopiService } from '../../src/services/vopi.service';
import { Job, JobStatus } from '../../src/types/vopi.types';
import { useTheme } from '../../src/contexts/ThemeContext';
import { haptics } from '../../src/utils/haptics';
import { SkeletonProductCard } from '../../src/components/ui/SkeletonProductCard';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../src/theme';
import { capitalizeFirst, formatDate, toCacheKey } from '../../src/utils/strings';
import { VOPIConfig } from '../../src/config/vopi.config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const JOBS_LIMIT = 50;
const POLL_INTERVAL = VOPIConfig.pollingInterval + 2000;
const ENRICH_CONCURRENCY = 5;
const MAX_ENRICHED_CACHE = 200;

const PROCESSING_STATUSES = [
  'pending',
  'downloading',
  'extracting',
  'scoring',
  'classifying',
  'extracting_product',
  'generating',
];

interface EnrichedData {
  thumbnail?: string;
  title?: string;
}

async function enrichInBatches(
  jobs: Job[],
  batchSize: number,
  signal: AbortSignal,
): Promise<Record<string, EnrichedData>> {
  const updates: Record<string, EnrichedData> = {};

  for (let i = 0; i < jobs.length; i += batchSize) {
    if (signal.aborted) break;
    const batch = jobs.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const [urls, meta] = await Promise.all([
          vopiService.getDownloadUrls(job.id).catch(() => null),
          vopiService.getProductMetadata(job.id).catch((err) => {
            if (__DEV__) console.warn('[Products] Failed to fetch metadata for', job.id, err);
            return null;
          }),
        ]);

        let thumbnail: string | undefined;
        if (urls?.commercialImages) {
          const firstVariant = Object.values(urls.commercialImages)[0];
          if (firstVariant) {
            thumbnail = Object.values(firstVariant)[0];
          }
        }

        return { id: job.id, thumbnail, title: meta?.product?.title };
      })
    );

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        updates[r.value.id] = { thumbnail: r.value.thumbnail, title: r.value.title };
      }
    });
  }

  return updates;
}

export default function ProductsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [enriched, setEnriched] = useState<Record<string, EnrichedData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);
      const result = await vopiService.listJobs({ limit: JOBS_LIMIT });
      if (isMountedRef.current) {
        setJobs(result.jobs);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Lazy-enrich completed jobs with thumbnail + title (batched, cancellable)
  useEffect(() => {
    const completedJobs = jobs.filter(
      (j) => j.status === 'completed' && !enrichedIdsRef.current.has(j.id)
    );
    if (completedJobs.length === 0) return;

    completedJobs.forEach((job) => enrichedIdsRef.current.add(job.id));

    const controller = new AbortController();

    enrichInBatches(completedJobs, ENRICH_CONCURRENCY, controller.signal)
      .then((updates) => {
        if (!controller.signal.aborted && isMountedRef.current && Object.keys(updates).length > 0) {
          setEnriched((prev) => {
            const merged = { ...prev, ...updates };
            // Evict oldest entries if cache exceeds limit
            const keys = Object.keys(merged);
            if (keys.length > MAX_ENRICHED_CACHE) {
              const toRemove = keys.slice(0, keys.length - MAX_ENRICHED_CACHE);
              toRemove.forEach((k) => delete merged[k]);
            }
            return merged;
          });
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[Products] Enrichment failed:', err);
        }
      });

    return () => {
      controller.abort();
    };
  }, [jobs]);

  const fetchProcessingStatuses = useCallback(async () => {
    const processingJobs = jobs.filter((job) => PROCESSING_STATUSES.includes(job.status));
    if (processingJobs.length === 0) return;

    try {
      const results = await Promise.all(
        processingJobs.map((job) =>
          vopiService.getJobStatus(job.id).then((status) => ({ id: job.id, status }))
        )
      );

      if (isMountedRef.current) {
        const newStatuses: Record<string, JobStatus> = {};
        let hasStatusChange = false;

        results.forEach(({ id, status }) => {
          newStatuses[id] = status;
          if (status.status === 'completed' || status.status === 'failed') {
            hasStatusChange = true;
          }
        });

        setJobStatuses((prev) => ({ ...prev, ...newStatuses }));
        if (hasStatusChange) fetchJobs();
      }
    } catch {
      // ignore polling errors
    }
  }, [jobs, fetchJobs]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchJobs();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchJobs, pathname]);

  useEffect(() => {
    const hasProcessing = jobs.some((job) => PROCESSING_STATUSES.includes(job.status));
    if (hasProcessing) {
      fetchProcessingStatuses();
      pollIntervalRef.current = setInterval(fetchProcessingStatuses, POLL_INTERVAL);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobs, fetchProcessingStatuses]);

  const onRefresh = () => {
    setRefreshing(true);
    enrichedIdsRef.current.clear();
    setEnriched({});
    fetchJobs();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'failed':
      case 'cancelled':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  const performDelete = useCallback(
    async (job: Job) => {
      haptics.medium();
      setDeletingIds((prev) => new Set(prev).add(job.id));
      try {
        await vopiService.deleteJob(job.id);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setJobs((prev) => prev.filter((j) => j.id !== job.id));
        setEnriched((prev) => {
          const next = { ...prev };
          delete next[job.id];
          return next;
        });
        enrichedIdsRef.current.delete(job.id);
      } catch (err) {
        Alert.alert('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
      }
    },
    []
  );

  const handleDelete = useCallback(
    (job: Job) => {
      const title = enriched[job.id]?.title || `Job #${job.id.slice(0, 8)}`;
      haptics.light();
      Alert.alert('Delete Product', `Are you sure you want to delete "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(job),
        },
      ]);
    },
    [enriched, performDelete]
  );

  const renderRightActions = useCallback(
    (job: Job) => (
      <TouchableOpacity
        style={[styles.swipeDeleteAction, { backgroundColor: colors.error }]}
        onPress={() => {
          swipeableRefs.current.get(job.id)?.close();
          handleDelete(job);
        }}
        accessibilityRole="button"
        accessibilityLabel="Delete"
      >
        <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </TouchableOpacity>
    ),
    [colors.error, handleDelete]
  );

  const renderItem = ({ item }: { item: Job }) => {
    const isCompleted = item.status === 'completed';
    const isProcessing = PROCESSING_STATUSES.includes(item.status);
    const isDeleting = deletingIds.has(item.id);
    const data = enriched[item.id];
    const cardTitle = data?.title || `Job #${item.id.slice(0, 8)}`;
    const dateStr = formatDate(item.createdAt);

    const detailedStatus = jobStatuses[item.id];
    const progressPercent = detailedStatus?.progress?.percentage ?? 0;
    const progressStep = detailedStatus?.progress?.step || detailedStatus?.progress?.message;

    const cardContent = (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.background }, isDeleting && styles.cardDeleting]}
        onPress={() => {
          if (isCompleted && !isDeleting) {
            haptics.light();
            router.push({ pathname: '/results', params: { jobId: item.id } });
          }
        }}
        disabled={!isCompleted || isDeleting}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${cardTitle}, ${dateStr}, ${item.status}`}
        accessibilityHint={isCompleted ? 'Tap to view product details' : undefined}
      >
        {isDeleting && (
          <View style={[styles.deletingOverlay, { backgroundColor: colors.overlayLight }]}>
            <ActivityIndicator size="large" color={colors.error} />
          </View>
        )}

        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {data?.thumbnail ? (
            <Image source={{ uri: data.thumbnail, cacheKey: toCacheKey(data.thumbnail) }} style={styles.thumbnail} contentFit="cover" cachePolicy="disk" />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons
                name={isCompleted ? 'image-outline' : 'cube-outline'}
                size={28}
                color={colors.borderDark}
              />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {cardTitle}
          </Text>
          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{dateStr}</Text>

          {isProcessing && progressPercent > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
              </View>
            </View>
          )}

          {!isCompleted && (
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status), minHeight: 24, justifyContent: 'center' }]}>
                <Text style={styles.statusText}>
                  {isProcessing && progressStep ? capitalizeFirst(progressStep) : item.status}
                </Text>
              </View>
              {isProcessing && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.processingIndicator} />
              )}
            </View>
          )}
        </View>

        {!isDeleting && (
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${cardTitle}`}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}

        {isCompleted && !isDeleting && (
          <Ionicons name="chevron-forward" size={18} color={colors.borderDark} style={styles.chevron} />
        )}
      </TouchableOpacity>
    );

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
          else swipeableRefs.current.delete(item.id);
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        {cardContent}
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={colors.borderDark} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Products Yet</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Process a video to see your products here</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Failed to Load</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={fetchJobs}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonProductCard />
      <SkeletonProductCard />
      <SkeletonProductCard />
      <SkeletonProductCard />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Products</Text>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={deletingIds}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={loading ? renderLoading() : error ? renderError() : renderEmpty()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.md,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginRight: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardDate: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  processingIndicator: {
    marginLeft: spacing.sm,
  },
  progressContainer: {
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  cardDeleting: {
    opacity: 0.5,
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: borderRadius.lg,
  },
  deleteBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  swipeDeleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
  },
  skeletonContainer: {
    paddingVertical: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
