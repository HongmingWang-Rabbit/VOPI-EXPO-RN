import { Platform } from 'react-native';

export const VOPIConfig = {
  // Production API
  apiUrl: 'https://api.vopi.24rabbit.com',

  // OAuth scheme (must match app.json "scheme") - for mobile
  scheme: 'vopi',

  // Web URL for OAuth redirect
  webUrl: 'https://vopi.24rabbit.com',

  // Google OAuth iOS client ID (reversed for redirect URI)
  googleIOSClientId: '613369473822-pi7ut8sau3oh8i942gi2chbnkf9s069r.apps.googleusercontent.com',
  googleIOSReversedClientId: 'com.googleusercontent.apps.613369473822-pi7ut8sau3oh8i942gi2chbnkf9s069r',

  // Timeouts
  uploadTimeout: 300000, // 5 minutes
  requestTimeout: 30000, // 30 seconds

  // Polling
  pollingInterval: 3000, // 3 seconds
  maxPollingAttempts: 200, // ~10 minutes max
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
