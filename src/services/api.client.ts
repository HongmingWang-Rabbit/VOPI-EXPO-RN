import { VOPIConfig } from '../config/vopi.config';

type GetAccessToken = () => Promise<string | null>;

interface RequestOptions {
  timeout?: number;
  retries?: number;
}

const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

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
    const timeout = requestOptions.timeout ?? VOPIConfig.requestTimeout;
    const maxRetries = requestOptions.retries ?? DEFAULT_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, timeout);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < maxRetries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on abort (timeout)
        if (lastError.name === 'AbortError') {
          throw new Error('Request timed out');
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
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
