import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UploadState } from '../../types/vopi.types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface UploadProgressProps {
  state: UploadState;
  onCancel: () => void;
}

function UploadProgressComponent({ state, onCancel }: UploadProgressProps) {
  // Memoize computed values
  const { isActive, progressPercent, statusText, accessibleText } = useMemo(() => {
    // Normalize progress to 0-1 range
    const getProgressValue = (): number => {
      if (state.status === 'uploading') {
        return state.progress;
      }
      if (state.status === 'processing') {
        return state.progress / 100;
      }
      return 0;
    };

    const percent = Math.round(getProgressValue() * 100);
    const active = state.status === 'uploading' || state.status === 'processing';

    let status = '';
    let accessible = '';

    if (state.status === 'uploading') {
      status = `Uploading: ${Math.round(state.progress * 100)}%`;
      accessible = `Upload progress: ${percent}% complete`;
    } else if (state.status === 'processing') {
      status = `${state.step}: ${state.progress}%`;
      accessible = `Processing: ${state.step}, ${percent}% complete`;
    } else if (state.status === 'error') {
      status = `Error: ${state.message}`;
      accessible = `Error occurred: ${state.message}`;
    } else if (state.status === 'cancelled') {
      status = 'Cancelled';
      accessible = 'Upload cancelled';
    }

    return {
      isActive: active,
      progressPercent: percent,
      statusText: status,
      accessibleText: accessible,
    };
  }, [state]);

  if (state.status === 'idle' || state.status === 'completed') {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Upload progress indicator"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progressPercent,
        text: accessibleText,
      }}
    >
      <Text style={styles.statusText}>{statusText}</Text>

      {isActive && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel upload"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.lg,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.borderDark,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  cancelButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

export const UploadProgress = memo(UploadProgressComponent);
