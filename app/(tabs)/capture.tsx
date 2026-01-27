import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../src/theme';
import { formatDuration } from '../../src/utils/strings';
import { VOPIConfig } from '../../src/config/vopi.config';

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: VOPIConfig.maxRecordingDuration,
      });

      if (video?.uri) {
        // Navigate to preview or directly upload
        Alert.alert(
          'Video Recorded',
          'Would you like to process this video?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Process',
              onPress: () => {
                router.push({
                  pathname: '/(tabs)',
                  params: { videoUri: video.uri },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      // Provide specific error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = 'Failed to record video. Please try again.';

      if (errorMessage.includes('permission')) {
        userMessage = 'Camera permission was denied. Please enable camera access in Settings.';
      } else if (errorMessage.includes('busy') || errorMessage.includes('use')) {
        userMessage = 'Camera is busy. Please close other apps using the camera and try again.';
      } else if (errorMessage.includes('storage') || errorMessage.includes('space')) {
        userMessage = 'Not enough storage space. Please free up some space and try again.';
      }

      if (__DEV__) {
        console.error('[Capture] Recording failed:', errorMessage);
      }

      Alert.alert('Recording Failed', userMessage);
    } finally {
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cameraRef.current?.stopRecording();
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Handle permissions
  if (!cameraPermission || !micPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          VOPI needs camera and microphone access to record product videos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicPermission();
          }}
          accessibilityRole="button"
          accessibilityLabel="Grant camera and microphone permission"
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Top Bar */}
        <SafeAreaView style={styles.topBar}>
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
            </View>
          )}
        </SafeAreaView>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.sideButton, isRecording && styles.sideButtonDisabled]}
            onPress={toggleFacing}
            disabled={isRecording}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Switch camera (disabled while recording)' : 'Switch camera'}
            accessibilityState={{ disabled: isRecording }}
          >
            <Ionicons name="camera-reverse" size={28} color={isRecording ? 'rgba(255,255,255,0.4)' : colors.white} />
          </TouchableOpacity>

          <View style={styles.recordButtonContainer}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPress={isRecording ? stopRecording : startRecording}
              accessibilityRole="button"
              accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
              accessibilityState={{ selected: isRecording }}
              accessibilityHint={isRecording ? 'Double tap to stop recording' : 'Double tap to start recording video'}
            >
              {isRecording ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.recordIcon} />
              )}
            </TouchableOpacity>
            {/* Text label for accessibility - visible indication of recording state */}
            <Text style={styles.recordButtonLabel}>
              {isRecording ? 'STOP' : 'REC'}
            </Text>
          </View>

          <View style={styles.sideButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  loadingText: {
    color: colors.white,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
    color: colors.text,
  },
  permissionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.xl,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  recordingText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sideButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButtonDisabled: {
    opacity: 0.5,
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
  recordButtonLabel: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  recordButtonActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderColor: colors.error,
  },
  recordIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.error,
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});
