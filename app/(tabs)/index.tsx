import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated, Easing, Modal, ActivityIndicator, Image } from 'react-native';
import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { useVOPIUpload } from '../../src/hooks/useVOPIUpload';
import { useTheme } from '../../src/contexts/ThemeContext';
import { VideoPicker } from '../../src/components/ui/VideoPicker';
import { UploadProgress } from '../../src/components/ui/UploadProgress';
import { SuccessCheckmark } from '../../src/components/ui/SuccessCheckmark';
import { haptics } from '../../src/utils/haptics';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../src/theme';

function OnboardingBullets() {
  const { colors } = useTheme();
  const opacity1 = useRef(new Animated.Value(0)).current;
  const opacity2 = useRef(new Animated.Value(0)).current;
  const opacity3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(opacity1, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity2, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity3, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [opacity1, opacity2, opacity3]);

  const bullets = [
    { icon: 'videocam' as const, text: 'Record or select a product video' },
    { icon: 'images' as const, text: 'AI extracts commercial images' },
    { icon: 'storefront' as const, text: 'Push to Shopify or Amazon' },
  ];
  const opacities = [opacity1, opacity2, opacity3];

  return (
    <View style={styles.onboarding}>
      {bullets.map((b, i) => (
        <Animated.View key={b.icon} style={[styles.bulletRow, { opacity: opacities[i] }]}>
          <Ionicons name={b.icon} size={22} color={colors.primary} />
          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{b.text}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri?: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { balance, refresh: refreshCredits, estimateCost } = useCredits();
  const { state, uploadAndProcess, cancel, reset } = useVOPIUpload();
  const [refreshing, setRefreshing] = useState(false);
  const [costEstimate, setCostEstimate] = useState<{ totalCredits: number; canAfford?: boolean } | null>(null);
  const [showCostModal, setShowCostModal] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const pendingVideoRef = useRef<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  // Track if we've already processed this videoUri to prevent double-processing
  const processedUriRef = useRef<string | null>(null);

  const showCostEstimateFor = useCallback(async (videoUri: string) => {
    pendingVideoRef.current = videoUri;
    setEstimating(true);
    setShowCostModal(true);
    setThumbnailUri(null);

    // Generate thumbnail
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
      setThumbnailUri(uri);
    } catch {
      // Thumbnail generation failed — non-critical
    }

    let durationSeconds = 30;
    let sound: Audio.Sound | null = null;
    try {
      const result = await Audio.Sound.createAsync({ uri: videoUri });
      sound = result.sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        durationSeconds = Math.ceil(status.durationMillis / 1000);
      }
    } catch {
      // Fall back to default duration
    } finally {
      await sound?.unloadAsync().catch(() => {});
    }
    const estimate = await estimateCost(durationSeconds);
    setCostEstimate(estimate);
    setEstimating(false);
  }, [estimateCost]);

  const confirmProcess = useCallback(() => {
    setShowCostModal(false);
    const uri = pendingVideoRef.current;
    if (uri) {
      processedUriRef.current = uri;
      uploadAndProcess({ uri, mimeType: 'video/mp4' });
    }
    pendingVideoRef.current = null;
    setCostEstimate(null);
  }, [uploadAndProcess]);

  const cancelCostModal = useCallback(() => {
    setShowCostModal(false);
    pendingVideoRef.current = null;
    setCostEstimate(null);
    setThumbnailUri(null);
  }, []);

  // Auto-process video from capture/preview screen — show cost estimate first
  useEffect(() => {
    if (params.videoUri && params.videoUri !== processedUriRef.current && state.status === 'idle' && !showCostModal) {
      showCostEstimateFor(params.videoUri);
    }
  }, [params.videoUri, state.status, showCostEstimateFor, showCostModal]);

  const handleVideoSelect = useCallback((video: { uri: string; fileName?: string; mimeType?: string }) => {
    haptics.light();
    // Delay navigation to let the image picker fully dismiss on physical devices.
    // Without this, router.push can silently fail while the picker is still closing.
    setTimeout(() => {
      router.push({
        pathname: '/video-preview',
        params: { videoUri: video.uri, source: 'library' },
      });
    }, 500);
  }, [router]);

  const handleViewResults = () => {
    if (state.status === 'completed') {
      router.push({
        pathname: '/results',
        params: {
          jobId: state.job.id,
        },
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCredits();
    } finally {
      setRefreshing(false);
    }
  }, [refreshCredits]);

  const isProcessing = state.status === 'uploading' || state.status === 'processing';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>Hello, {user?.name || 'User'}</Text>
        </View>
        <View style={[styles.creditsPill, { backgroundColor: colors.primaryBackground }]}>
          <Text style={[styles.creditsText, { color: colors.primary }]}>{balance} credits</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Process Video</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Select a product video to extract frames and generate commercial images.
        </Text>

        {state.status === 'idle' && <OnboardingBullets />}

        <VideoPicker onSelect={handleVideoSelect} disabled={isProcessing} />

        <UploadProgress state={state} onCancel={cancel} />

        {/* Show option to check Products tab while processing */}
        {state.status === 'processing' && state.jobId && (
          <View style={styles.processingActions}>
            <Text style={[styles.processingHint, { color: colors.textSecondary }]}>
              Processing will continue in the background
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                router.push('/(tabs)/products');
              }}
              accessibilityRole="button"
              accessibilityLabel="Check status in Products tab"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Check Products Tab</Text>
            </TouchableOpacity>
          </View>
        )}

        {state.status === 'completed' && (
          <View style={styles.completedActions}>
            <SuccessCheckmark />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.success }]}
              onPress={handleViewResults}
              accessibilityRole="button"
              accessibilityLabel="View processing results"
            >
              <Text style={styles.primaryButtonText}>View Results</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                reset();
                processedUriRef.current = null;
                refreshCredits();
              }}
              accessibilityRole="button"
              accessibilityLabel="Process another video"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Process Another Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {(state.status === 'error' || state.status === 'cancelled') && (
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Cost Estimation Modal */}
      <Modal visible={showCostModal} transparent animationType="fade" onRequestClose={cancelCostModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Processing Cost</Text>
            {thumbnailUri && (
              <Image source={{ uri: thumbnailUri }} style={styles.modalThumbnail} />
            )}
            {estimating ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.modalLoader} />
            ) : costEstimate ? (
              <>
                <View style={[styles.costRow, { backgroundColor: colors.primaryBackground }]}>
                  <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Credits required</Text>
                  <Text style={[styles.costValue, { color: colors.primary }]}>{costEstimate.totalCredits}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Your balance</Text>
                  <Text style={[styles.costValue, { color: costEstimate.canAfford === false ? colors.error : colors.success }]}>
                    {balance}
                  </Text>
                </View>
                {costEstimate.canAfford === false && (
                  <Text style={[styles.insufficientText, { color: colors.error }]}>
                    Insufficient credits. Purchase more in Settings.
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.costLabel, { color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md }]}>
                Unable to estimate cost. You can still proceed.
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={cancelCostModal}>
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: costEstimate?.canAfford === false ? colors.borderDark : colors.primary }]}
                onPress={confirmProcess}
                disabled={costEstimate?.canAfford === false}
              >
                <Text style={styles.modalConfirmText}>Process</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    ...shadows.sm,
  },
  greeting: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  creditsPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  creditsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  onboarding: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bulletText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  processingActions: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  processingHint: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  completedActions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalThumbnail: {
    width: '100%',
    height: 160,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: '#000',
  },
  modalLoader: {
    marginVertical: spacing.xl,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  costLabel: {
    fontSize: fontSize.md,
  },
  costValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  insufficientText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
