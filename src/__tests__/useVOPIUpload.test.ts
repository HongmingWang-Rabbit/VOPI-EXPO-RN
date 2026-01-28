import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVOPIUpload } from '../hooks/useVOPIUpload';
import { vopiService } from '../services/vopi.service';
import { Job, JobStatusType, PresignResponse, DownloadUrlsResponse } from '../types/vopi.types';

// Mock vopiService
jest.mock('../services/vopi.service', () => ({
  vopiService: {
    getPresignedUrl: jest.fn(),
    uploadFile: jest.fn(),
    createJob: jest.fn(),
    getJobStatus: jest.fn(),
    cancelJob: jest.fn(),
    getJob: jest.fn(),
    getDownloadUrls: jest.fn(),
  },
}));

// Mock config
jest.mock('../config/vopi.config', () => ({
  VOPIConfig: {
    pollingInterval: 100,
    maxPollingAttempts: 5,
  },
}));

const mockVopiService = vopiService as jest.Mocked<typeof vopiService>;

// Helper to create mock objects
const createMockPresignResponse = (): PresignResponse => ({
  uploadUrl: 'https://s3.example.com/upload',
  publicUrl: 'https://cdn.example.com/video.mp4',
  key: 'videos/test.mp4',
  expiresIn: 3600,
});

const createMockJob = (status: JobStatusType = 'pending'): Job => ({
  id: 'job-123',
  status,
  videoUrl: 'https://cdn.example.com/video.mp4',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockDownloadUrls = (): DownloadUrlsResponse => ({
  jobId: 'job-123',
  expiresIn: 3600,
  frames: [],
  commercialImages: {
    lifestyle: { v1: 'https://example.com/img1.jpg' },
  },
});

describe('useVOPIUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts with idle state', () => {
    const { result } = renderHook(() => useVOPIUpload());

    expect(result.current.state.status).toBe('idle');
  });

  describe('uploadAndProcess', () => {
    it('transitions to uploading state', async () => {
      mockVopiService.getPresignedUrl.mockResolvedValue(createMockPresignResponse());
      mockVopiService.uploadFile.mockResolvedValue(undefined);
      mockVopiService.createJob.mockResolvedValue(createMockJob());
      mockVopiService.getJobStatus.mockResolvedValue({
        id: 'job-123',
        status: 'extracting',
        progress: { step: 'Extracting', percentage: 50, message: 'Processing...' },
        createdAt: new Date().toISOString(),
      });

      const { result } = renderHook(() => useVOPIUpload());

      act(() => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
      });

      expect(result.current.state.status).toBe('uploading');
    });

    it('handles upload errors', async () => {
      mockVopiService.getPresignedUrl.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        await result.current.uploadAndProcess({ uri: 'file://video.mp4' });
      });

      expect(result.current.state.status).toBe('error');
      if (result.current.state.status === 'error') {
        expect(result.current.state.message).toBe('Network error');
      }
    });

    it('handles job completion', async () => {
      const mockJob = createMockJob('completed');
      const mockDownloadUrls = createMockDownloadUrls();

      mockVopiService.getPresignedUrl.mockResolvedValue(createMockPresignResponse());
      mockVopiService.uploadFile.mockResolvedValue(undefined);
      mockVopiService.createJob.mockResolvedValue(mockJob);
      mockVopiService.getJobStatus.mockResolvedValue({
        id: 'job-123',
        status: 'completed',
        progress: { step: 'Done', percentage: 100, message: 'Done' },
        createdAt: new Date().toISOString(),
      });
      mockVopiService.getJob.mockResolvedValue(mockJob);
      mockVopiService.getDownloadUrls.mockResolvedValue(mockDownloadUrls);

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
        // Run timers to trigger polling
        await jest.advanceTimersByTimeAsync(200);
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('completed');
      });
    });

    it('handles job failure', async () => {
      mockVopiService.getPresignedUrl.mockResolvedValue(createMockPresignResponse());
      mockVopiService.uploadFile.mockResolvedValue(undefined);
      mockVopiService.createJob.mockResolvedValue(createMockJob());
      mockVopiService.getJobStatus.mockResolvedValue({
        id: 'job-123',
        status: 'failed',
        progress: { step: 'Failed', percentage: 50, message: 'Failed' },
        createdAt: new Date().toISOString(),
      });

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
        await jest.advanceTimersByTimeAsync(200);
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
      });
    });
  });

  describe('cancel', () => {
    it('cancels the upload and sets cancelled state', async () => {
      mockVopiService.getPresignedUrl.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(createMockPresignResponse()), 5000))
      );

      const { result } = renderHook(() => useVOPIUpload());

      act(() => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(result.current.state.status).toBe('cancelled');
    });

    it('calls cancelJob when job has been created', async () => {
      mockVopiService.getPresignedUrl.mockResolvedValue(createMockPresignResponse());
      mockVopiService.uploadFile.mockResolvedValue(undefined);
      mockVopiService.createJob.mockResolvedValue(createMockJob());
      mockVopiService.getJobStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          id: 'job-123',
          status: 'extracting' as JobStatusType,
          progress: { step: 'Extracting', percentage: 50, message: 'Processing...' },
          createdAt: new Date().toISOString(),
        }), 1000))
      );
      mockVopiService.cancelJob.mockResolvedValue({ id: 'job-123', status: 'cancelled', message: 'Cancelled' });

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
        await jest.advanceTimersByTimeAsync(50);
      });

      await act(async () => {
        await result.current.cancel();
      });

      expect(mockVopiService.cancelJob).toHaveBeenCalledWith('job-123');
      expect(result.current.state.status).toBe('cancelled');
    });
  });

  describe('reset', () => {
    it('resets state to idle', async () => {
      mockVopiService.getPresignedUrl.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        await result.current.uploadAndProcess({ uri: 'file://video.mp4' });
      });

      expect(result.current.state.status).toBe('error');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe('idle');
    });
  });

  describe('polling timeout', () => {
    it('errors after max polling attempts', async () => {
      mockVopiService.getPresignedUrl.mockResolvedValue(createMockPresignResponse());
      mockVopiService.uploadFile.mockResolvedValue(undefined);
      mockVopiService.createJob.mockResolvedValue(createMockJob());
      // Always return processing, never complete
      mockVopiService.getJobStatus.mockResolvedValue({
        id: 'job-123',
        status: 'extracting',
        progress: { step: 'Extracting', percentage: 50, message: 'Processing...' },
        createdAt: new Date().toISOString(),
      });

      const { result } = renderHook(() => useVOPIUpload());

      await act(async () => {
        result.current.uploadAndProcess({ uri: 'file://video.mp4' });
        // Advance timers beyond max polling attempts
        for (let i = 0; i < 10; i++) {
          await jest.advanceTimersByTimeAsync(100);
        }
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe('error');
        if (result.current.state.status === 'error') {
          expect(result.current.state.message).toContain('timed out');
        }
      });
    });
  });
});
