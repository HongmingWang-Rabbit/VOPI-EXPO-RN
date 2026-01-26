import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform secure storage utility
 * - Uses expo-secure-store on native (iOS/Android) - encrypted storage
 * - Uses sessionStorage on web for sensitive data (tokens)
 *
 * Security notes for web:
 * - sessionStorage is cleared when the browser tab closes
 * - This provides some protection against persistent XSS attacks
 * - For production, consider using httpOnly cookies for tokens
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */

// Keys that should use session storage on web for security
const SESSION_STORAGE_KEYS = new Set([
  'vopi_access_token',
  'vopi_refresh_token',
  'oauth_state',
  'oauth_code_verifier',
]);

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Use sessionStorage for sensitive keys, localStorage for others
      if (SESSION_STORAGE_KEYS.has(key)) {
        return sessionStorage.getItem(key);
      }
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Use sessionStorage for sensitive keys, localStorage for others
      if (SESSION_STORAGE_KEYS.has(key)) {
        sessionStorage.setItem(key, value);
        return;
      }
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Try both storage types to ensure cleanup
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },

  /**
   * Clear all auth-related storage
   * Useful for logout and error recovery
   */
  async clearAuth(): Promise<void> {
    const authKeys = [
      'vopi_access_token',
      'vopi_refresh_token',
      'vopi_user',
      'oauth_state',
      'oauth_code_verifier',
      'oauth_provider',
    ];
    await Promise.all(authKeys.map((key) => storage.deleteItem(key)));
  },
};
