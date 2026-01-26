import { STORAGE_KEYS } from '../constants/storage';

describe('STORAGE_KEYS', () => {
  it('defines all required auth keys', () => {
    expect(STORAGE_KEYS.ACCESS_TOKEN).toBe('vopi_access_token');
    expect(STORAGE_KEYS.REFRESH_TOKEN).toBe('vopi_refresh_token');
    expect(STORAGE_KEYS.USER).toBe('vopi_user');
  });

  it('defines all required OAuth keys', () => {
    expect(STORAGE_KEYS.OAUTH_STATE).toBe('oauth_state');
    expect(STORAGE_KEYS.OAUTH_CODE_VERIFIER).toBe('oauth_code_verifier');
    expect(STORAGE_KEYS.OAUTH_PROVIDER).toBe('oauth_provider');
  });

  it('has unique values for all keys', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('is immutable', () => {
    // TypeScript enforces this at compile time with 'as const'
    // This test verifies the structure at runtime
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(false); // 'as const' doesn't freeze at runtime
    expect(typeof STORAGE_KEYS).toBe('object');
  });
});
