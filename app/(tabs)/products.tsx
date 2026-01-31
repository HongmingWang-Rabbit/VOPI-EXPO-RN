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
  TextInput,
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

const JOBS_LIMIT = 20;
/** Poll at half the frequency of the upload hook to reduce API load on the list screen */
const LIST_POLL_MULTIPLIER = 2;
const POLL_INTERVAL = VOPIConfig.pollingInterval * LIST_POLL_MULTIPLIER;
/** Max parallel metadata+thumbnail fetches to avoid overwhelming the API */
const ENRICH_CONCURRENCY = 5;
/** Evict oldest enriched entries when cache exceeds this size to bound memory */
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

const STATUS_FILTERS = [
  { key: null, label: 'All' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
] as const;

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const totalFetchedRef = useRef(0);

  const fetchJobs = useCallback(async (offset = 0, append = false) => {
    try {
      setError(null);
      const result = await vopiService.listJobs({ limit: JOBS_LIMIT, offset });
      if (isMountedRef.current) {
        if (append) {
          setJobs((prev) => {
            const updated = [...prev, ...result.jobs];
            totalFetchedRef.current = updated.length;
            return updated;
          });
        } else {
          setJobs(result.jobs);
          totalFetchedRef.current = result.jobs.length;
        }
        setHasMore(result.jobs.length >= JOBS_LIMIT);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load jobs');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    fetchJobs(totalFetchedRef.current, true);
  }, [fetchJobs, loadingMore, hasMore, loading]);

  // Lazy-enrich completed jobs with thumbnail + title (batched, cancellable)
  useEffect(() => {
    const completedJobs = jobs.filter(
      (j) => j.status === 'completed' && !enrichedIdsRef.current.has(j.id)
    );
    if (completedJobs.length === 0) return;

    // Track in-flight IDs to prevent duplicate requests, but don't commit
    // to enrichedIdsRef until enrichment succeeds so failed jobs can be retried.
    const inFlightIds = new Set(completedJobs.map((j) => j.id));
    completedJobs.forEach((job) => enrichedIdsRef.current.add(job.id));

    const controller = new AbortController();

    enrichInBatches(completedJobs, ENRICH_CONCURRENCY, controller.signal)
      .then((updates) => {
        if (!controller.signal.aborted && isMountedRef.current && Object.keys(updates).length > 0) {
          setEnriched((prev) => {
            const merged = { ...prev, ...updates };
            const keys = Object.keys(merged);
            if (keys.length > MAX_ENRICHED_CACHE) {
              const toRemove = keys.slice(0, keys.length - MAX_ENRICHED_CACHE);
              toRemove.forEach((k) => delete merged[k]);
            }
            return merged;
          });
          // Remove IDs that weren't enriched so they can be retried
          inFlightIds.forEach((id) => {
            if (!(id in updates)) enrichedIdsRef.current.delete(id);
          });
        }
      })
      .catch((err) => {
        if (__DEV__) {
          console.warn('[Products] Enrichment failed:', err);
        }
        // Allow retry on next render for all failed jobs
        inFlightIds.forEach((id) => enrichedIdsRef.current.delete(id));
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
        if (hasStatusChange) fetchJobs(0, false);
      }
    } catch {
      // ignore polling errors
    }
  }, [jobs, fetchJobs]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchJobs(0, false);
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
    setHasMore(true);
    enrichedIdsRef.current.clear();
    setEnriched({});
    fetchJobs(0, false);
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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    haptics.light();
    Alert.alert(
      'Delete Selected',
      `Are you sure you want to delete ${selectedIds.size} product${selectedIds.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBulkDeleting(true);
            const ids = Array.from(selectedIds);
            const results = await Promise.allSettled(ids.map((id) => vopiService.deleteJob(id)));
            const failedCount = results.filter((r) => r.status === 'rejected').length;
            const succeededIds = new Set(
              ids.filter((_, i) => results[i].status === 'fulfilled')
            );
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setJobs((prev) => prev.filter((j) => !succeededIds.has(j.id)));
            succeededIds.forEach((id) => enrichedIdsRef.current.delete(id));
            setEnriched((prev) => {
              const next = { ...prev };
              succeededIds.forEach((id) => delete next[id]);
              return next;
            });
            exitSelectMode();
            setBulkDeleting(false);
            if (failedCount > 0) {
              Alert.alert('Partial Failure', `${failedCount} product${failedCount > 1 ? 's' : ''} could not be deleted.`);
            }
          },
        },
      ]
    );
  }, [selectedIds, exitSelectMode]);

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

  const filteredJobs = React.useMemo(() => {
    let result = jobs;
    if (statusFilter) {
      if (statusFilter === 'processing') {
        result = result.filter((j) => PROCESSING_STATUSES.includes(j.status));
      } else {
        result = result.filter((j) => j.status === statusFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((j) => {
        const title = enriched[j.id]?.title?.toLowerCase() || '';
        const id = j.id.toLowerCase();
        return title.includes(q) || id.includes(q);
      });
    }
    return result;
  }, [jobs, enriched, statusFilter, searchQuery]);

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

    const isSelected = selectedIds.has(item.id);

    const cardContent = (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.background }, isDeleting && styles.cardDeleting, isSelected && { borderColor: colors.primary, borderWidth: 2 }]}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
            return;
          }
          if (isCompleted && !isDeleting) {
            haptics.light();
            router.push({ pathname: '/results', params: { jobId: item.id } });
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            haptics.medium();
            setSelectMode(true);
            toggleSelect(item.id);
          }
        }}
        disabled={isDeleting}
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

        {/* Select checkbox */}
        {selectMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? colors.primary : colors.borderDark}
            />
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

        {!isDeleting && !selectMode && (
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
      <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => fetchJobs(0, false)}>
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
        {selectMode ? (
          <View style={styles.selectHeader}>
            <TouchableOpacity onPress={exitSelectMode}>
              <Text style={[styles.selectHeaderAction, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={handleBulkDelete} disabled={selectedIds.size === 0 || bulkDeleting}>
              <Text style={[styles.selectHeaderAction, { color: selectedIds.size > 0 ? colors.error : colors.textTertiary }]}>
                {bulkDeleting ? 'Deleting...' : 'Delete'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selectHeader}>
            <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Products</Text>
            {jobs.length > 0 && (
              <TouchableOpacity onPress={() => setSelectMode(true)}>
                <Text style={[styles.selectHeaderAction, { color: colors.primary }]}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search products..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[
                styles.filterChip,
                { borderColor: statusFilter === f.key ? colors.primary : colors.border,
                  backgroundColor: statusFilter === f.key ? colors.primaryBackground : colors.background },
              ]}
              onPress={() => setStatusFilter(statusFilter === f.key ? null : f.key)}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === f.key ? colors.primary : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredJobs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={{ deletingIds, selectedIds, selectMode }}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={loading ? renderLoading() : error ? renderError() : renderEmpty()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} style={styles.loadMoreIndicator} /> : null}
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
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectHeaderAction: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  checkboxContainer: {
    marginRight: spacing.sm,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  loadMoreIndicator: {
    paddingVertical: spacing.lg,
  },
});
