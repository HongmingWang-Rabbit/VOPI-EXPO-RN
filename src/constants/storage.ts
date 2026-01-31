/**
 * Storage keys used throughout the application
 * Centralized to prevent duplication and ensure consistency
 */
export const STORAGE_KEYS = {
  // Auth tokens
  ACCESS_TOKEN: 'vopi_access_token',
  REFRESH_TOKEN: 'vopi_refresh_token',
  USER: 'vopi_user',

  // OAuth flow
  OAUTH_STATE: 'oauth_state',
  OAUTH_CODE_VERIFIER: 'oauth_code_verifier',
  OAUTH_PROVIDER: 'oauth_provider',

  // App state
  ONBOARDING_COMPLETED: 'vopi_onboarding_completed',
  METADATA_TEMPLATES: 'vopi_metadata_templates',
  THEME_MODE: 'vopi_theme_mode',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
