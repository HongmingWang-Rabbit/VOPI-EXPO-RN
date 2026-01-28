import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../constants/storage';

// Mock dependencies
jest.mock('../utils/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

jest.mock('../config/vopi.config', () => ({
  VOPIConfig: {
    apiUrl: 'https://api.test.com',
    webUrl: 'https://app.test.com',
  },
  getRedirectUri: () => 'https://app.test.com/oauth/callback',
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockStorage = storage as jest.Mocked<typeof storage>;

// Wrapper component for the hook
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Default: no stored auth
    mockStorage.getItem.mockResolvedValue(null);
  });

  describe('initial state', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });

    it('loads stored auth on mount', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      mockStorage.getItem.mockImplementation(async (key) => {
        switch (key) {
          case STORAGE_KEYS.ACCESS_TOKEN:
            return 'valid-access-token';
          case STORAGE_KEYS.REFRESH_TOKEN:
            return 'valid-refresh-token';
          case STORAGE_KEYS.USER:
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      // Mock successful profile fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });
      // Mock balance fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 100 }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });

    it('handles no stored credentials', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe('signOut', () => {
    it('clears auth state and storage', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      mockStorage.getItem.mockImplementation(async (key) => {
        switch (key) {
          case STORAGE_KEYS.ACCESS_TOKEN:
            return 'valid-access-token';
          case STORAGE_KEYS.REFRESH_TOKEN:
            return 'valid-refresh-token';
          case STORAGE_KEYS.USER:
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      // Mock successful profile fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 100 }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Mock logout request
      mockFetch.mockResolvedValueOnce({ ok: true });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(mockStorage.deleteItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockStorage.deleteItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockStorage.deleteItem).toHaveBeenCalledWith(STORAGE_KEYS.USER);
    });

    it('clears local state even if server logout fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };

      mockStorage.getItem.mockImplementation(async (key) => {
        switch (key) {
          case STORAGE_KEYS.ACCESS_TOKEN:
            return 'valid-access-token';
          case STORAGE_KEYS.REFRESH_TOKEN:
            return 'valid-refresh-token';
          case STORAGE_KEYS.USER:
            return JSON.stringify(mockUser);
          default:
            return null;
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 100 }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Mock logout request failure
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.signOut();
      });

      // Should still clear local state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
    });
  });

  describe('getAccessToken', () => {
    it('returns stored token if not expired', async () => {
      // Create a valid JWT with future expiration
      const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(JSON.stringify({ sub: 'user-123', exp: futureExp }));
      const validToken = `${header}.${payload}.signature`;

      mockStorage.getItem.mockImplementation(async (key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return validToken;
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return 'refresh-token';
        if (key === STORAGE_KEYS.USER) return JSON.stringify({ id: 'user-123' });
        return null;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'user-123' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 100 }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const token = await result.current.getAccessToken();
      expect(token).toBe(validToken);
    });

    it('returns null when no token stored', async () => {
      mockStorage.getItem.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const token = await result.current.getAccessToken();
      expect(token).toBe(null);
    });
  });

  describe('refreshUser', () => {
    it('updates user data from server', async () => {
      const initialUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      const updatedUser = { id: 'user-123', email: 'test@example.com', name: 'Updated Name' };

      mockStorage.getItem.mockImplementation(async (key) => {
        if (key === STORAGE_KEYS.ACCESS_TOKEN) return 'valid-token';
        if (key === STORAGE_KEYS.REFRESH_TOKEN) return 'refresh-token';
        if (key === STORAGE_KEYS.USER) return JSON.stringify(initialUser);
        return null;
      });

      // Initial profile fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => initialUser,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 100 }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // refreshUser profile fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedUser,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ balance: 200 }),
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user?.name).toBe('Updated Name');
      expect(result.current.user?.creditsBalance).toBe(200);
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});

// Helper for creating base64
function btoa(str: string): string {
  return Buffer.from(str).toString('base64');
}
