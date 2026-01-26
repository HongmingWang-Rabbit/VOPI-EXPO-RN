import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface VideoPickerProps {
  onSelect: (video: { uri: string; fileName?: string; mimeType?: string }) => void;
  disabled?: boolean;
}

export function VideoPicker({ onSelect, disabled }: VideoPickerProps) {
  const handlePress = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select videos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onSelect({
          uri: asset.uri,
          fileName: asset.fileName || 'video.mp4',
          mimeType: asset.mimeType || 'video/mp4',
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to access video library. Please try again.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Select video from library"
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        Select Video
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.borderDark,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  buttonTextDisabled: {
    color: colors.textTertiary,
  },
});
