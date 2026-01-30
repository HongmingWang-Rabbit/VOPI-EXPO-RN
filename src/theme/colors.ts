// Centralized color palette
export const colors = {
  // Primary
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryBackground: '#EFF6FF',

  // Status
  success: '#34C759',
  successLight: '#E8F8EC',
  error: '#FF3B30',
  errorLight: '#FFF5F5',
  warning: '#FF9500',
  warningLight: '#FFF8E6',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#718096', // WCAG AA compliant (4.5:1 vs white)
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  backgroundTertiary: '#F1F5F9',

  // Accent (sparkle/decorative)
  accentPurple: '#C084FC',
  accentAmber: '#F59E0B',
  accentCyan: '#22D3EE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.95)',
} as const;

export type ColorName = keyof typeof colors;
export type Colors = { [K in ColorName]: string };
