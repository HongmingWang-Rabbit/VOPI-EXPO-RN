import { capitalizeFirst, decodeJWTPayload, formatDuration } from '../utils/strings';

describe('capitalizeFirst', () => {
  it('capitalizes the first letter of a string', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });

  it('handles already capitalized string', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });

  it('only capitalizes first letter', () => {
    expect(capitalizeFirst('hello world')).toBe('Hello world');
  });
});

describe('decodeJWTPayload', () => {
  // Valid JWT token for testing (header.payload.signature)
  // Payload: { "sub": "1234567890", "name": "John Doe", "exp": 1893456000 }
  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxODkzNDU2MDAwfQ.signature';

  it('decodes a valid JWT payload', () => {
    const payload = decodeJWTPayload(validToken);
    expect(payload).toEqual({
      sub: '1234567890',
      name: 'John Doe',
      exp: 1893456000,
    });
  });

  it('returns null for invalid token format', () => {
    expect(decodeJWTPayload('invalid')).toBeNull();
    expect(decodeJWTPayload('only.two')).toBeNull();
    expect(decodeJWTPayload('')).toBeNull();
  });

  it('returns null for invalid base64', () => {
    expect(decodeJWTPayload('header.!!!invalid!!!.signature')).toBeNull();
  });

  it('returns null for invalid JSON in payload', () => {
    // Valid base64 but not valid JSON
    const invalidJsonToken = 'header.aGVsbG8gd29ybGQ.signature'; // "hello world" in base64
    expect(decodeJWTPayload(invalidJsonToken)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('pads seconds with zero', () => {
    expect(formatDuration(61)).toBe('1:01');
  });
});
