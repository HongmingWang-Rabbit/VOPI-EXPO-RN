import { Platform } from 'react-native';
import { env } from './env';

export const VOPIConfig = {
  // API URLs from environment
  apiUrl: env.apiUrl,
  webUrl: env.webUrl,

  // OAuth scheme (must match app.json "scheme") - for mobile
  scheme: env.scheme,

  // Google OAuth iOS client ID (reversed for redirect URI)
  googleIOSClientId: env.googleIOSClientId,
  googleIOSReversedClientId: env.googleIOSReversedClientId,

  // Timeouts
  uploadTimeout: env.uploadTimeout,
  requestTimeout: env.requestTimeout,

  // Polling
  pollingInterval: env.pollingInterval,
  maxPollingAttempts: env.maxPollingAttempts,
} as const;

// OAuth redirect URI - platform specific
// iOS: {reversed_client_id}:/oauth2redirect/google (Google's required format)
// Android: {scheme}://oauth/callback
// Web: https://vopi.24rabbit.com/oauth/callback
export const getRedirectUri = () => {
  if (Platform.OS === 'web') {
    return `${VOPIConfig.webUrl}/oauth/callback`;
  }
  if (Platform.OS === 'ios') {
    return `${VOPIConfig.googleIOSReversedClientId}:/oauth2redirect/google`;
  }
  // Android
  return `${VOPIConfig.scheme}://oauth/callback`;
};

// Checkout redirect URLs - platform specific
export const getCheckoutUrls = () => {
  if (Platform.OS === 'web') {
    return {
      success: `${VOPIConfig.webUrl}/purchase/success`,
      cancel: `${VOPIConfig.webUrl}/purchase/cancel`,
    };
  }
  // Mobile
  return {
    success: `${VOPIConfig.scheme}://purchase/success`,
    cancel: `${VOPIConfig.scheme}://purchase/cancel`,
  };
};
