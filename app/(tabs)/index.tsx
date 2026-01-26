import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCredits } from '../../src/hooks/useCredits';
import { useVOPIUpload } from '../../src/hooks/useVOPIUpload';
import { VideoPicker } from '../../src/components/ui/VideoPicker';
import { UploadProgress } from '../../src/components/ui/UploadProgress';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ videoUri?: string }>();
  const { user, signOut } = useAuth();
  const { balance, refresh: refreshCredits } = useCredits();
  const { state, uploadAndProcess, cancel, reset } = useVOPIUpload();

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

  const isProcessing = state.status === 'uploading' || state.status === 'processing';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.credits}>{balance} credits</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Process Video</Text>
        <Text style={styles.description}>
          Select a product video to extract frames and generate commercial images.
        </Text>

        <VideoPicker onSelect={handleVideoSelect} disabled={isProcessing} />

        <UploadProgress state={state} onCancel={cancel} />

        {state.status === 'completed' && (
          <View style={styles.completedActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleViewResults}
              accessibilityRole="button"
              accessibilityLabel="View processing results"
            >
              <Text style={styles.primaryButtonText}>View Results</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                reset();
                refreshCredits();
              }}
              accessibilityRole="button"
              accessibilityLabel="Process another video"
            >
              <Text style={styles.secondaryButtonText}>Process Another Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {(state.status === 'error' || state.status === 'cancelled') && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  credits: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signOut: {
    color: colors.error,
    fontSize: fontSize.sm,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  completedActions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
});
