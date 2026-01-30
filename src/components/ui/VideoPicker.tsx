import React, { memo, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { haptics } from '../../utils/haptics';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

interface VideoPickerProps {
  onSelect: (video: { uri: string; fileName?: string; mimeType?: string }) => void;
  disabled?: boolean;
}

function VideoPickerComponent({ onSelect, disabled }: VideoPickerProps) {
  const { colors } = useTheme();

  const handlePress = useCallback(async () => {
    haptics.light();
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
  }, [onSelect]);

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: disabled ? colors.borderDark : colors.primary }]}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Select video from library"
      accessibilityState={{ disabled }}
    >
      <View style={styles.buttonContent}>
        <Ionicons name="videocam-outline" size={20} color={disabled ? colors.textTertiary : '#FFFFFF'} />
        <Text style={[styles.buttonText, disabled && { color: colors.textTertiary }]}>
          Select Video
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});

export const VideoPicker = memo(VideoPickerComponent);
