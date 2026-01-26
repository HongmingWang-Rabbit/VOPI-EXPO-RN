import { Platform } from 'react-native';

export const VOPIConfig = {
  // Production API
  apiUrl: 'https://api.vopi.24rabbit.com',

  // OAuth scheme (must match app.json "scheme") - for mobile
  scheme: 'vopi',

  // Web URL for OAuth redirect
  webUrl: 'https://vopi.24rabbit.com',

  // Timeouts
  uploadTimeout: 300000, // 5 minutes
  requestTimeout: 30000, // 30 seconds

  // Polling
  pollingInterval: 3000, // 3 seconds
  maxPollingAttempts: 200, // ~10 minutes max
} as const;

// OAuth redirect URI - platform specific
// Mobile: vopi://oauth/callback
// Web: https://vopi.24rabbit.com/oauth/callback
export const getRedirectUri = () => {
  if (Platform.OS === 'web') {
    return `${VOPIConfig.webUrl}/oauth/callback`;
  }
  return `${VOPIConfig.scheme}://oauth/callback`;
};
