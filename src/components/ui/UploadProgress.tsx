import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UploadState } from '../../types/vopi.types';

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

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{getStatusText()}</Text>

      {isActive && (
        <>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${getProgressValue() * 100}%` }]}
            />
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginVertical: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
});
