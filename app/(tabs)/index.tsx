import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Animated, Easing } from 'react-native';
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
  const { balance, refresh: refreshCredits } = useCredits();
  const { state, uploadAndProcess, cancel, reset } = useVOPIUpload();
  const [refreshing, setRefreshing] = useState(false);

  // Track if we've already processed this videoUri to prevent double-processing
  const processedUriRef = useRef<string | null>(null);

  // Auto-process video from capture screen
  useEffect(() => {
    if (params.videoUri && params.videoUri !== processedUriRef.current && state.status === 'idle') {
      processedUriRef.current = params.videoUri;
      uploadAndProcess({ uri: params.videoUri, mimeType: 'video/mp4' });
    }
  }, [params.videoUri, state.status, uploadAndProcess]);

  const handleVideoSelect = async (video: { uri: string; fileName?: string; mimeType?: string }) => {
    haptics.light();
    await uploadAndProcess(video);
  };

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshCredits();
    setTimeout(() => setRefreshing(false), 1000);
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
});
