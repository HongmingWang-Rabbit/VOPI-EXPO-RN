import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UploadState } from '../../types/vopi.types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface UploadProgressProps {
  state: UploadState;
  onCancel: () => void;
}

export function UploadProgress({ state, onCancel }: UploadProgressProps) {
  if (state.status === 'idle' || state.status === 'completed') {
    return null;
  }

  const getProgressValue = () => {
    if (state.status === 'uploading') return state.progress;
    if (state.status === 'processing') return state.progress / 100;
    return 0;
  };

  const getStatusText = () => {
    if (state.status === 'uploading') {
      return `Uploading: ${Math.round(state.progress * 100)}%`;
    }
    if (state.status === 'processing') {
      return `${state.step}: ${state.progress}%`;
    }
    if (state.status === 'error') {
      return `Error: ${state.message}`;
    }
    if (state.status === 'cancelled') {
      return 'Cancelled';
    }
    return '';
  };

  const isActive = state.status === 'uploading' || state.status === 'processing';
  const progressPercent = Math.round(getProgressValue() * 100);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progressPercent,
        text: getStatusText(),
      }}
    >
      <Text style={styles.statusText}>{getStatusText()}</Text>

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
