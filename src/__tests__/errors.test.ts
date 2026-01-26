import {
  APIError,
  NetworkError,
  TimeoutError,
  isAPIError,
  isNetworkError,
  isTimeoutError,
} from '../utils/errors';

describe('APIError', () => {
  it('creates error with message and status', () => {
    const error = new APIError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.name).toBe('APIError');
  });

  it('creates error with code and details', () => {
    const error = new APIError('Validation failed', 400, 'VALIDATION_ERROR', {
      field: 'email',
    });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'email' });
  });

  describe('error type checks', () => {
    it('identifies client errors', () => {
      expect(new APIError('', 400).isClientError()).toBe(true);
      expect(new APIError('', 404).isClientError()).toBe(true);
      expect(new APIError('', 499).isClientError()).toBe(true);
      expect(new APIError('', 500).isClientError()).toBe(false);
    });

    it('identifies server errors', () => {
      expect(new APIError('', 500).isServerError()).toBe(true);
      expect(new APIError('', 503).isServerError()).toBe(true);
      expect(new APIError('', 400).isServerError()).toBe(false);
    });

    it('identifies auth errors', () => {
      expect(new APIError('', 401).isAuthError()).toBe(true);
      expect(new APIError('', 403).isAuthError()).toBe(false);
    });

    it('identifies forbidden errors', () => {
      expect(new APIError('', 403).isForbiddenError()).toBe(true);
      expect(new APIError('', 401).isForbiddenError()).toBe(false);
    });

    it('identifies not found errors', () => {
      expect(new APIError('', 404).isNotFoundError()).toBe(true);
      expect(new APIError('', 400).isNotFoundError()).toBe(false);
    });

    it('identifies validation errors', () => {
      expect(new APIError('', 400).isValidationError()).toBe(true);
      expect(new APIError('', 422).isValidationError()).toBe(true);
      expect(new APIError('', 404).isValidationError()).toBe(false);
    });

    it('identifies rate limit errors', () => {
      expect(new APIError('', 429).isRateLimitError()).toBe(true);
      expect(new APIError('', 400).isRateLimitError()).toBe(false);
    });
  });

  describe('getUserMessage', () => {
    it('returns user-friendly messages for common status codes', () => {
      expect(new APIError('', 400).getUserMessage()).toContain('Invalid request');
      expect(new APIError('', 401).getUserMessage()).toContain('session has expired');
      expect(new APIError('', 403).getUserMessage()).toContain('permission');
      expect(new APIError('', 404).getUserMessage()).toContain('not found');
      expect(new APIError('', 429).getUserMessage()).toContain('Too many requests');
      expect(new APIError('', 500).getUserMessage()).toContain('Server error');
    });

    it('returns original message for unknown status codes', () => {
      expect(new APIError('Custom error', 418).getUserMessage()).toBe('Custom error');
    });
  });
});

describe('NetworkError', () => {
  it('creates error with default message', () => {
    const error = new NetworkError();
    expect(error.message).toContain('Unable to connect');
    expect(error.name).toBe('NetworkError');
  });

  it('creates error with custom message', () => {
    const error = new NetworkError('Custom network error');
    expect(error.message).toBe('Custom network error');
  });
});

describe('TimeoutError', () => {
  it('creates error with default message', () => {
    const error = new TimeoutError();
    expect(error.message).toContain('timed out');
    expect(error.name).toBe('TimeoutError');
  });

  it('creates error with custom message', () => {
    const error = new TimeoutError('Custom timeout error');
    expect(error.message).toBe('Custom timeout error');
  });
});

describe('Type guards', () => {
  it('isAPIError returns true for APIError', () => {
    expect(isAPIError(new APIError('test', 400))).toBe(true);
    expect(isAPIError(new Error('test'))).toBe(false);
    expect(isAPIError(null)).toBe(false);
  });

  it('isNetworkError returns true for NetworkError', () => {
    expect(isNetworkError(new NetworkError())).toBe(true);
    expect(isNetworkError(new Error('test'))).toBe(false);
  });

  it('isTimeoutError returns true for TimeoutError', () => {
    expect(isTimeoutError(new TimeoutError())).toBe(true);
    expect(isTimeoutError(new Error('test'))).toBe(false);
  });
});
