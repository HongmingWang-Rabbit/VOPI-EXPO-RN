import { VOPIConfig } from '../config/vopi.config';
import { validateEnv } from '../config/env';
import { APIError, TimeoutError, NetworkError, createAPIError } from '../utils/errors';

type GetAccessToken = () => Promise<string | null>;

interface RequestOptions {
  timeout?: number;
  retries?: number;
}

const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const NETWORK_ERROR_PATTERNS = [
  'network',
  'failed to fetch',
  'load failed',
  'internet',
  'offline',
  'connection',
  'econnrefused',
  'enotfound',
  'etimedout',
];

class APIClient {
  private getAccessToken: GetAccessToken | null = null;

  setTokenGetter(getter: GetAccessToken) {
    this.getAccessToken = getter;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;

        if (__DEV__) {
          // Log token preview to verify it's being set correctly
          const tokenPreview = token.length > 30
            ? `${token.slice(0, 15)}...${token.slice(-10)}`
            : token;
          console.log('[API] Setting Authorization header:', { tokenPreview, tokenLength: token.length });
        }
      } else if (__DEV__) {
        console.warn('[API] No token available for Authorization header');
      }
    }

    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    requestOptions: RequestOptions = {}
  ): Promise<Response> {
    validateEnv();
    const timeout = requestOptions.timeout ?? VOPIConfig.requestTimeout;
    const maxRetries = requestOptions.retries ?? DEFAULT_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, timeout);

        // Don't retry on client errors (4xx), except retriable ones
        if (response.status >= 400 && response.status < 500) {
          const isRetriable = response.status === 408 || response.status === 429;
          if (!isRetriable || attempt >= maxRetries) {
            return response;
          }
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < maxRetries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          if (__DEV__) {
            console.error('[API] Request timed out after', timeout, 'ms');
          }
          throw new TimeoutError();
        }

        // Detect network errors more robustly
        const isNetworkErr = this.isNetworkError(error);

        if (__DEV__) {
          console.error('[API] Fetch error:', {
            attempt: attempt + 1,
            maxRetries,
            isNetworkError: isNetworkErr,
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }

        if (isNetworkErr) {
          lastError = new NetworkError();
        } else {
          lastError = error instanceof Error ? error : new Error('Unknown error');
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError ?? new NetworkError();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Detect network errors more robustly than string matching
   * Handles various network error scenarios across platforms
   */
  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    // TypeError is thrown by fetch on network failures
    if (error instanceof TypeError) {
      return true;
    }

    // Check error name for common network error types
    const networkErrorNames = ['NetworkError', 'TypeError', 'FetchError'];
    if (networkErrorNames.includes(error.name)) {
      return true;
    }

    // Check message patterns for network-related errors
    const lowerMessage = error.message.toLowerCase();
    return NETWORK_ERROR_PATTERNS.some((pattern) => lowerMessage.includes(pattern));
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await createAPIError(response);

      if (__DEV__) {
        console.error('[API] Request failed:', {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
        });
      }

      throw error;
    }

    // 204 No Content has no body
    if (response.status === 204) {
      return undefined!;
    }

    return response.json();
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number>,
    options?: RequestOptions
  ): Promise<T> {
    const url = new URL(`${VOPIConfig.apiUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await this.fetchWithRetry(
      url.toString(),
      {
        method: 'GET',
        headers: await this.getHeaders(),
      },
      options
    );

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.fetchWithRetry(
      `${VOPIConfig.apiUrl}${path}`,
      {
        method: 'POST',
        headers: await this.getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      },
      options
    );

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    const response = await this.fetchWithRetry(
      `${VOPIConfig.apiUrl}${path}`,
      {
        method: 'PATCH',
        headers: await this.getHeaders(),
        body: JSON.stringify(body),
      },
      options
    );

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await this.fetchWithRetry(
      `${VOPIConfig.apiUrl}${path}`,
      {
        method: 'DELETE',
        headers: await this.getHeaders(),
      },
      options
    );

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new APIClient();
