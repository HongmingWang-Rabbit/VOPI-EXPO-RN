import Constants from 'expo-constants';

/**
 * Environment configuration
 * Values are loaded from app.json extra config or environment variables
 *
 * To configure:
 * 1. For local development: Update app.json "extra" section
 * 2. For production: Set environment variables in your build system
 */

interface EnvConfig {
  apiUrl: string;
  webUrl: string;
  googleIOSClientId: string;
  googleIOSReversedClientId: string;
  scheme: string;
  uploadTimeout: number;
  requestTimeout: number;
  pollingInterval: number;
  maxPollingAttempts: number;
  maxRecordingDuration: number;
}

const extra = Constants.expoConfig?.extra ?? {};

// Default values for development
const defaults: EnvConfig = {
  apiUrl: 'https://api.vopi.24rabbit.com',
  webUrl: 'https://vopi.24rabbit.com',
  googleIOSClientId: '',
  googleIOSReversedClientId: '',
  scheme: 'vopi',
  uploadTimeout: 300000, // 5 minutes
  requestTimeout: 30000, // 30 seconds
  pollingInterval: 3000, // 3 seconds
  maxPollingAttempts: 200, // ~10 minutes max
  maxRecordingDuration: 60, // 60 seconds
};

export const env: EnvConfig = {
  apiUrl: extra.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? defaults.apiUrl,
  webUrl: extra.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? defaults.webUrl,
  googleIOSClientId: extra.googleIOSClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? defaults.googleIOSClientId,
  googleIOSReversedClientId: extra.googleIOSReversedClientId ?? process.env.EXPO_PUBLIC_GOOGLE_IOS_REVERSED_CLIENT_ID ?? defaults.googleIOSReversedClientId,
  scheme: extra.scheme ?? defaults.scheme,
  uploadTimeout: extra.uploadTimeout ?? defaults.uploadTimeout,
  requestTimeout: extra.requestTimeout ?? defaults.requestTimeout,
  pollingInterval: extra.pollingInterval ?? defaults.pollingInterval,
  maxPollingAttempts: extra.maxPollingAttempts ?? defaults.maxPollingAttempts,
  maxRecordingDuration: extra.maxRecordingDuration ?? defaults.maxRecordingDuration,
};

// Validate required configuration in production
if (!__DEV__) {
  const requiredKeys: (keyof EnvConfig)[] = ['apiUrl', 'webUrl'];
  const missingKeys = requiredKeys.filter((key) => !env[key]);
  if (missingKeys.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingKeys.join(', ')}`;
    console.error(errorMessage);
    // In production, throw to prevent app from running with invalid config
    throw new Error(errorMessage);
  }
}
