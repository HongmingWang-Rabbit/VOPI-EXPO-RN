import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { vopiService } from '../../src/services/vopi.service';
import { Job, JobStatus } from '../../src/types/vopi.types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';
import { capitalizeFirst, formatDate } from '../../src/utils/strings';
import { VOPIConfig } from '../../src/config/vopi.config';

const JOBS_LIMIT = 50;
const POLL_INTERVAL = VOPIConfig.pollingInterval + 2000; // Slightly slower than job polling

// Job statuses that indicate processing is in progress
const PROCESSING_STATUSES = [
  'pending',
  'downloading',
  'extracting',
  'scoring',
  'classifying',
  'extracting_product',
  'generating',
];

export default function ProductsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

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
      if (__DEV__) {
        console.error('[Products] Failed to fetch jobs:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Fetch status for processing jobs
  const fetchProcessingStatuses = useCallback(async () => {
    const processingJobs = jobs.filter((job) => PROCESSING_STATUSES.includes(job.status));
    if (processingJobs.length === 0) return;

    try {
      const statusPromises = processingJobs.map((job) =>
        vopiService.getJobStatus(job.id).then((status) => ({ id: job.id, status }))
      );
      const results = await Promise.all(statusPromises);

      if (isMountedRef.current) {
        const newStatuses: Record<string, JobStatus> = {};
        let hasStatusChange = false;

        results.forEach(({ id, status }) => {
          newStatuses[id] = status;
          // Check if any job completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            hasStatusChange = true;
          }
        });

        setJobStatuses((prev) => ({ ...prev, ...newStatuses }));

        // Refresh job list if any job completed/failed
        if (hasStatusChange) {
          fetchJobs();
        }
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[Products] Failed to fetch job statuses:', err);
      }
    }
  }, [jobs, fetchJobs]);

  // Fetch jobs on mount and when navigating to this screen
  useEffect(() => {
    isMountedRef.current = true;
    fetchJobs();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchJobs, pathname]);

  // Auto-poll for processing jobs
  useEffect(() => {
    const hasProcessingJobs = jobs.some((job) => PROCESSING_STATUSES.includes(job.status));

    if (hasProcessingJobs) {
      // Fetch immediately
      fetchProcessingStatuses();

      // Set up polling
      pollIntervalRef.current = setInterval(fetchProcessingStatuses, POLL_INTERVAL);

      if (__DEV__) {
        console.log('[Products] Started polling for', jobs.filter((j) => PROCESSING_STATUSES.includes(j.status)).length, 'processing jobs');
      }
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

  const renderItem = ({ item, index }: { item: Job; index: number }) => {
    const dateStr = formatDate(item.createdAt);
    const isCompleted = item.status === 'completed';
    const isProcessing = PROCESSING_STATUSES.includes(item.status);
    const isFailed = item.status === 'failed' || item.status === 'cancelled';
    const jobNumber = index + 1;

    // Get detailed status if available
    const detailedStatus = jobStatuses[item.id];
    const progressPercent = detailedStatus?.progress?.percentage ?? 0;
    const progressStep = detailedStatus?.progress?.step || detailedStatus?.progress?.message;

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => {
          if (isCompleted) {
            router.push({
              pathname: '/results',
              params: { jobId: item.id },
            });
          }
        }}
        disabled={!isCompleted}
        accessibilityRole="button"
        accessibilityLabel={`Job ${jobNumber}, created ${dateStr}, status ${item.status}${isCompleted ? '. Tap to view results' : ''}`}
        accessibilityState={{ disabled: !isCompleted }}
        accessibilityHint={isCompleted ? 'Opens the job results' : `Job is ${item.status}`}
      >
        <View style={styles.jobInfo}>
          <View style={styles.jobHeader}>
            <Text style={styles.jobId} numberOfLines={1}>
              Job #{item.id.slice(0, 8)}
            </Text>
            {isProcessing && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.processingIndicator} />
            )}
          </View>
          <Text style={styles.jobDate}>{dateStr}</Text>

          {/* Progress bar for processing jobs */}
          {isProcessing && progressPercent > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progressStep ? `${capitalizeFirst(progressStep)} - ${progressPercent}%` : `${progressPercent}%`}
              </Text>
            </View>
          )}

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {isProcessing && progressStep ? capitalizeFirst(progressStep) : item.status}
            </Text>
          </View>
        </View>
        {isCompleted && (
          <Ionicons name="chevron-forward" size={20} color={colors.borderDark} />
        )}
        {isFailed && (
          <Ionicons name="alert-circle" size={20} color={colors.error} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={colors.borderDark} />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyText}>
        Process a video to see your products here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
      <Text style={styles.emptyTitle}>Failed to Load</Text>
      <Text style={styles.emptyText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={fetchJobs}
        accessibilityRole="button"
        accessibilityLabel="Retry loading products"
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.emptyContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading products...</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">Products</Text>
      </View>

      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? renderLoading() : error ? renderError() : renderEmpty()
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundTertiary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  jobInfo: {
    flex: 1,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  jobId: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  processingIndicator: {
    marginLeft: spacing.sm,
  },
  progressContainer: {
    marginVertical: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderDark,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  jobDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  statusText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
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
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
