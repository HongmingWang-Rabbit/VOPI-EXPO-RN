/**
 * Custom error types for better error handling
 */

/**
 * API error with status code and optional error code
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is a forbidden error (403)
   */
  isForbiddenError(): boolean {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFoundError(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a validation error (400/422)
   */
  isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  /**
   * Check if error is a rate limit error (429)
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.';
      default:
        return this.message || 'An unexpected error occurred.';
    }
  }
}

/**
 * Network error for connection issues
 */
export class NetworkError extends Error {
  constructor(message = 'Unable to connect. Please check your internet connection.') {
    super(message);
    this.name = 'NetworkError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * Timeout error for request timeouts
 */
export class TimeoutError extends Error {
  constructor(message = 'Request timed out. Please try again.') {
    super(message);
    this.name = 'TimeoutError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Helper to create appropriate error from fetch response
 */
export async function createAPIError(response: Response): Promise<APIError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;

  try {
    const body = await response.json();
    message = body.message || body.error || message;
    code = body.code;
    details = body.details;
  } catch {
    // Response body is not JSON, use default message
  }

  return new APIError(message, response.status, code, details);
}

/**
 * Helper to check if an error is a specific type
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
