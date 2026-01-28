import { APIError, NetworkError, TimeoutError } from '../utils/errors';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock VOPIConfig
jest.mock('../config/vopi.config', () => ({
  VOPIConfig: {
    apiUrl: 'https://api.test.com',
    requestTimeout: 5000,
  },
}));

// Import after mocking
import { apiClient } from '../services/api.client';

describe('APIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('setTokenGetter', () => {
    it('sets token getter and includes token in requests', async () => {
      const mockToken = 'test-access-token';
      apiClient.setTokenGetter(async () => mockToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('does not include Authorization header when token is null', async () => {
      apiClient.setTokenGetter(async () => null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await apiClient.get('/test');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });

  describe('GET requests', () => {
    it('makes GET request with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.get<{ success: boolean }>('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual({ success: true });
    });

    it('appends query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiClient.get('/api/test', { limit: 10, offset: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=20'),
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('makes POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      });

      const body = { name: 'test', value: 42 };
      await apiClient.post('/api/test', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws APIError for non-ok responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Resource not found' }),
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow(APIError);
    });

    it('throws TimeoutError when request times out', async () => {
      // Create an abort error
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(apiClient.get('/api/test')).rejects.toThrow(TimeoutError);
    });

    it('throws NetworkError for connection failures', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(networkError);

      // Will retry, so need to reject multiple times
      mockFetch.mockRejectedValueOnce(networkError);
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(apiClient.get('/api/test')).rejects.toThrow(NetworkError);
    });
  });

  describe('retry logic', () => {
    it('retries on 5xx server errors', async () => {
      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.get<{ success: boolean }>('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('does not retry on 4xx client errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Bad request' }),
      });

      await expect(apiClient.get('/api/test')).rejects.toThrow(APIError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('retries on network errors with exponential backoff', async () => {
      const networkError = new TypeError('Failed to fetch');

      // Fail twice, then succeed
      mockFetch.mockRejectedValueOnce(networkError);
      mockFetch.mockRejectedValueOnce(networkError);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const result = await apiClient.get<{ success: boolean }>('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ success: true });
    });

    it('respects max retries limit', async () => {
      const networkError = new TypeError('Failed to fetch');

      // Fail all retries
      mockFetch.mockRejectedValue(networkError);

      await expect(apiClient.get('/api/test')).rejects.toThrow(NetworkError);

      // Default retries is 2, so 3 total attempts (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('PATCH requests', () => {
    it('makes PATCH request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ updated: true }),
      });

      const body = { name: 'updated' };
      await apiClient.patch('/api/test/123', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('makes DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deleted: true }),
      });

      await apiClient.delete('/api/test/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
