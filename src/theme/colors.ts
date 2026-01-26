// Centralized color palette
export const colors = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0055CC',

  // Status
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  text: '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#EEEEEE',
  borderDark: '#DDDDDD',
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  backgroundTertiary: '#F8F8F8',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
} as const;

export type ColorName = keyof typeof colors;
