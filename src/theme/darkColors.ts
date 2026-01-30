import { Colors } from './colors';

// Dark mode palette mirroring the light colors type
export const darkColors: Colors = {
  // Primary
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  primaryBackground: '#1E293B',

  // Status
  success: '#34D399',
  successLight: '#064E3B',
  error: '#F87171',
  errorLight: '#450A0A',
  warning: '#FBBF24',
  warningLight: '#451A03',

  // Neutral
  white: '#0F172A',
  black: '#F8FAFC',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  border: '#334155',
  borderDark: '#475569',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',

  // Accent (sparkle/decorative)
  accentPurple: '#C084FC',
  accentAmber: '#F59E0B',
  accentCyan: '#22D3EE',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(255, 255, 255, 0.1)',
  overlayDark: 'rgba(0, 0, 0, 0.95)',
} as const;
