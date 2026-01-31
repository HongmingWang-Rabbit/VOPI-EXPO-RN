import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * Cross-platform secure storage utility
 * - Uses expo-secure-store on native (iOS/Android) - encrypted storage
 * - Uses localStorage on web (persists across sessions)
 *
 * Security notes for web:
 * - localStorage persists until explicitly cleared
 * - For production with high security needs, consider httpOnly cookies
 * - OAuth temporary state uses sessionStorage (cleared on tab close)
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */

// Keys that should use sessionStorage (temporary, cleared on tab close)
// Only OAuth flow state - NOT tokens (tokens need to persist)
const SESSION_STORAGE_KEYS: Set<string> = new Set([
  STORAGE_KEYS.OAUTH_STATE,
  STORAGE_KEYS.OAUTH_CODE_VERIFIER,
  STORAGE_KEYS.OAUTH_PROVIDER,
]);

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // OAuth state uses sessionStorage (temporary), everything else uses localStorage
      if (SESSION_STORAGE_KEYS.has(key)) {
        return sessionStorage.getItem(key);
      }
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // OAuth state uses sessionStorage (temporary), everything else uses localStorage
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
    const authKeys = Object.values(STORAGE_KEYS);
    await Promise.all(authKeys.map((key) => storage.deleteItem(key)));
  },
};
