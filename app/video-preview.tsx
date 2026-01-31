import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { haptics } from '../src/utils/haptics';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../src/theme';

export default function VideoPreviewScreen() {
  const router = useRouter();
  const { videoUri, source } = useLocalSearchParams<{ videoUri: string; source?: string }>();
  const { colors } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const lastPlayingRef = useRef(true);

  const handleProcess = useCallback(() => {
    haptics.medium();
    router.replace({
      pathname: '/(tabs)',
      params: { videoUri },
    });
  }, [router, videoUri]);

  const handleRetake = useCallback(() => {
    haptics.light();
    router.back();
  }, [router]);

  const togglePlayback = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
    // isPlaying state is updated by onPlaybackStatusUpdate callback
  }, [isPlaying]);

  if (!videoUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>No video to preview</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Video Player */}
      <TouchableOpacity style={styles.videoContainer} onPress={togglePlayback} activeOpacity={1}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.isPlaying !== lastPlayingRef.current) {
              lastPlayingRef.current = status.isPlaying;
              setIsPlaying(status.isPlaying);
            }
          }}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        {!isPlaying && !isLoading && (
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={72} color="rgba(255,255,255,0.8)" />
          </View>
        )}
      </TouchableOpacity>

      {/* Bottom Controls */}
      <SafeAreaView edges={['bottom']} style={styles.controlsContainer}>
        <View style={[styles.controls, { backgroundColor: colors.background }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>
            Review your video before processing
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.retakeButton, { borderColor: colors.border }]}
              onPress={handleRetake}
              accessibilityRole="button"
              accessibilityLabel={source === 'capture' ? 'Re-record video' : 'Choose different video'}
            >
              <Ionicons name={source === 'capture' ? 'refresh' : 'arrow-back'} size={20} color={colors.text} />
              <Text style={[styles.retakeText, { color: colors.text }]}>
                {source === 'capture' ? 'Re-record' : 'Choose Another'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.processButton, { backgroundColor: colors.primary }]}
              onPress={handleProcess}
              accessibilityRole="button"
              accessibilityLabel="Process this video"
            >
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.processText}>Process Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controls: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  previewLabel: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  retakeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  processButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  processText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
