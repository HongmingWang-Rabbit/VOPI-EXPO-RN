/**
 * Capitalizes the first character and replaces underscores with spaces
 */
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

/**
 * Safely decode a JWT token payload
 * Returns null if token is invalid
 */
export function decodeJWTPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Handle URL-safe base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Format duration in seconds to H:MM:SS or M:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract stable pathname from a URL for use as an image cache key.
 * Strips query params (presigned URL signatures) so the same image
 * hits the cache across sessions even when the signature changes.
 */
export function toCacheKey(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Generate a unique ID, using crypto.randomUUID when available
 * with a fallback for environments that don't support it.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Safely format a date string, returning a fallback if invalid
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }
    return date.toLocaleDateString();
  } catch {
    return 'Unknown date';
  }
}
