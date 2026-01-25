export const VOPIConfig = {
  // Production API
  apiUrl: 'https://api.vopi.24rabbit.com',

  // OAuth scheme (must match app.json "scheme")
  scheme: 'vopi',

  // Timeouts
  uploadTimeout: 300000, // 5 minutes
  requestTimeout: 30000, // 30 seconds

  // Polling
  pollingInterval: 3000, // 3 seconds
  maxPollingAttempts: 200, // ~10 minutes max
} as const;

// OAuth redirect URI - must be registered with Google/Apple
// Format: {scheme}://oauth/callback
export const getRedirectUri = () => {
  return `${VOPIConfig.scheme}://oauth/callback`;
};
