import React, { memo } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, fontSize, fontWeight, shadows } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

function ButtonComponent({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const bgColors: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.backgroundSecondary,
    destructive: colors.error,
    outline: 'transparent',
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.text,
    destructive: '#FFFFFF',
    outline: colors.primary,
  };

  const paddings: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  };

  const fontSizes: Record<ButtonSize, number> = {
    sm: fontSize.xs,
    md: fontSize.sm,
    lg: fontSize.md,
  };

  const iconSizes: Record<ButtonSize, number> = {
    sm: 14,
    md: 18,
    lg: 20,
  };

  const bg = bgColors[variant];
  const fg = textColors[variant];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        paddings[size],
        { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={iconSizes[size]} color={fg} style={{ marginRight: spacing.xs }} />}
          <Text style={[styles.text, { color: fg, fontSize: fontSizes[size] }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});

export const Button = memo(ButtonComponent);
