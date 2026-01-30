import { vopiService } from '../services/vopi.service';
import { apiClient } from '../services/api.client';
// Mock dependencies
jest.mock('../services/api.client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the new expo-file-system File class
const mockFileInstance = {
  exists: true,
  size: 10000,
};

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockFileInstance),
}));

// Mock expo/fetch with partial Response type
jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('../config/vopi.config', () => ({
  VOPIConfig: {
    uploadTimeout: 60000,
  },
}));

// Import mocked expo/fetch
import { fetch as expoFetch } from 'expo/fetch';
const mockExpoFetch = expoFetch as jest.MockedFunction<typeof expoFetch>;

// Helper to create mock response
const createMockResponse = (options: { ok: boolean; status?: number }): unknown => ({
  ok: options.ok,
  status: options.status ?? (options.ok ? 200 : 500),
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('vopiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpoFetch.mockReset();
    // Reset mock file instance to default valid state
    mockFileInstance.exists = true;
    mockFileInstance.size = 10000;
  });

  describe('getProviders', () => {
    it('calls apiClient.get with correct path', async () => {
      mockApiClient.get.mockResolvedValue({ google: true, apple: true });

      const result = await vopiService.getProviders();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/auth/providers');
      expect(result).toEqual({ google: true, apple: true });
    });
  });

  describe('getBalance', () => {
    it('calls apiClient.get with correct path', async () => {
      const mockBalance = { balance: 100, transactions: [] };
      mockApiClient.get.mockResolvedValue(mockBalance);

      const result = await vopiService.getBalance();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/credits/balance');
      expect(result).toEqual(mockBalance);
    });
  });

  describe('getPacks', () => {
    it('calls apiClient.get with correct path', async () => {
      const mockPacks = { packs: [{ packType: 'basic', credits: 100 }], stripeConfigured: true };
      mockApiClient.get.mockResolvedValue(mockPacks);

      const result = await vopiService.getPacks();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/credits/packs');
      expect(result).toEqual(mockPacks);
    });
  });

  describe('estimateCost', () => {
    it('calls apiClient.post with duration and frame count', async () => {
      const mockEstimate = { estimatedCredits: 50 };
      mockApiClient.post.mockResolvedValue(mockEstimate);

      const result = await vopiService.estimateCost(120, 10);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/credits/estimate', {
        videoDurationSeconds: 120,
        frameCount: 10,
      });
      expect(result).toEqual(mockEstimate);
    });
  });

  describe('createCheckout', () => {
    it('calls apiClient.post with checkout details', async () => {
      const mockCheckout = { checkoutUrl: 'https://stripe.com/checkout/123', sessionId: 'sess_123' };
      mockApiClient.post.mockResolvedValue(mockCheckout);

      const result = await vopiService.createCheckout('basic', 'https://app.com/success', 'https://app.com/cancel');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/credits/checkout', {
        packType: 'basic',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });
      expect(result).toEqual(mockCheckout);
    });
  });

  describe('getPresignedUrl', () => {
    it('calls apiClient.post with filename and content type', async () => {
      const mockPresign = { uploadUrl: 'https://s3.example.com/upload', publicUrl: 'https://cdn.example.com/video.mp4', key: 'test.mp4' };
      mockApiClient.post.mockResolvedValue(mockPresign);

      const result = await vopiService.getPresignedUrl('video.mp4', 'video/mp4');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/uploads/presign', {
        filename: 'video.mp4',
        contentType: 'video/mp4',
      });
      expect(result).toEqual(mockPresign);
    });
  });

  describe('uploadFile', () => {
    it('throws error if file does not exist', async () => {
      mockFileInstance.exists = false;

      await expect(
        vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4')
      ).rejects.toThrow('File not found');
    });

    it('throws error if file is empty', async () => {
      mockFileInstance.exists = true;
      mockFileInstance.size = 0;

      await expect(
        vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4')
      ).rejects.toThrow('File is empty');
    });

    it('throws error if file is too small', async () => {
      mockFileInstance.exists = true;
      mockFileInstance.size = 500;

      await expect(
        vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4')
      ).rejects.toThrow('corrupted');
    });

    it('successfully uploads file', async () => {
      mockFileInstance.exists = true;
      mockFileInstance.size = 10000;
      mockExpoFetch.mockResolvedValue(createMockResponse({ ok: true }) as never);

      const onProgress = jest.fn();
      await vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4', onProgress);

      expect(mockExpoFetch).toHaveBeenCalledWith(
        'https://s3.example.com/upload',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'video/mp4' },
        })
      );
      expect(onProgress).toHaveBeenCalledWith(1);
    });

    it('retries on server errors', async () => {
      mockFileInstance.exists = true;
      mockFileInstance.size = 10000;

      // First call fails with 500
      mockExpoFetch.mockResolvedValueOnce(createMockResponse({ ok: false, status: 500 }) as never);
      // Second call succeeds
      mockExpoFetch.mockResolvedValueOnce(createMockResponse({ ok: true }) as never);

      await vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4');

      expect(mockExpoFetch).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      mockFileInstance.exists = true;
      mockFileInstance.size = 10000;

      // All calls fail
      mockExpoFetch.mockResolvedValue(createMockResponse({ ok: false, status: 500 }) as never);

      await expect(
        vopiService.uploadFile('https://s3.example.com/upload', 'file://test.mp4', 'video/mp4')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('createJob', () => {
    it('calls apiClient.post with video URL and config', async () => {
      const mockJob = { id: 'job-123', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      mockApiClient.post.mockResolvedValue(mockJob);

      const result = await vopiService.createJob('https://cdn.example.com/video.mp4', { stackId: 'unified_video_analyzer' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/jobs', {
        videoUrl: 'https://cdn.example.com/video.mp4',
        config: { stackId: 'unified_video_analyzer' },
      });
      expect(result).toEqual(mockJob);
    });
  });

  describe('getJob', () => {
    it('calls apiClient.get with job ID', async () => {
      const mockJob = { id: 'job-123', status: 'completed' };
      mockApiClient.get.mockResolvedValue(mockJob);

      const result = await vopiService.getJob('job-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/jobs/job-123');
      expect(result).toEqual(mockJob);
    });
  });

  describe('getJobStatus', () => {
    it('calls apiClient.get with job ID', async () => {
      const mockStatus = { status: 'processing', progress: { percentage: 50 } };
      mockApiClient.get.mockResolvedValue(mockStatus);

      const result = await vopiService.getJobStatus('job-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/jobs/job-123/status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('cancelJob', () => {
    it('calls apiClient.post with cancel endpoint', async () => {
      const mockResponse = { id: 'job-123', status: 'cancelled', message: 'Job cancelled' };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await vopiService.cancelJob('job-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/jobs/job-123/cancel');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteJob', () => {
    it('calls apiClient.delete with job ID', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await vopiService.deleteJob('job-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/jobs/job-123');
    });
  });

  describe('deleteJobImage', () => {
    it('calls apiClient.delete with job ID, frameId, and version', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await vopiService.deleteJobImage('job-123', 'frame-1', 'v1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/jobs/job-123/images/frame-1/v1');
    });
  });

  describe('listJobs', () => {
    it('calls apiClient.get with params', async () => {
      const mockJobs = { jobs: [], total: 0 };
      mockApiClient.get.mockResolvedValue(mockJobs);

      const result = await vopiService.listJobs({ status: 'completed', limit: 10 });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/jobs', { status: 'completed', limit: 10 });
      expect(result).toEqual(mockJobs);
    });
  });

  describe('getDownloadUrls', () => {
    it('calls apiClient.get with job ID and expires', async () => {
      const mockUrls = { images: {}, expiresAt: new Date().toISOString() };
      mockApiClient.get.mockResolvedValue(mockUrls);

      const result = await vopiService.getDownloadUrls('job-123', 7200);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/jobs/job-123/download-urls', { expiresIn: 7200 });
      expect(result).toEqual(mockUrls);
    });
  });

  describe('getProductMetadata', () => {
    it('calls apiClient.get with job ID', async () => {
      const mockMetadata = { product: { name: 'Test Product' } };
      mockApiClient.get.mockResolvedValue(mockMetadata);

      const result = await vopiService.getProductMetadata('job-123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/jobs/job-123/metadata');
      expect(result).toEqual(mockMetadata);
    });
  });

  describe('getConnections', () => {
    it('calls apiClient.get with correct path', async () => {
      const mockConnections = { connections: [{ id: 'conn-1', platform: 'shopify' }] };
      mockApiClient.get.mockResolvedValue(mockConnections);

      const result = await vopiService.getConnections();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/connections');
      expect(result).toEqual(mockConnections);
    });
  });

  describe('getShopifyAuthUrl', () => {
    it('calls apiClient.get and returns authUrl string', async () => {
      mockApiClient.get.mockResolvedValue({ authUrl: 'https://shopify.com/oauth' });

      const result = await vopiService.getShopifyAuthUrl('mystore.myshopify.com');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/oauth/shopify/authorize',
        { shop: 'mystore.myshopify.com', response_type: 'json' }
      );
      expect(result).toBe('https://shopify.com/oauth');
    });
  });

  describe('getAmazonAuthUrl', () => {
    it('calls apiClient.get and returns authUrl string', async () => {
      mockApiClient.get.mockResolvedValue({ authUrl: 'https://sellercentral.amazon.com/oauth' });

      const result = await vopiService.getAmazonAuthUrl();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/oauth/amazon/authorize',
        { response_type: 'json' }
      );
      expect(result).toBe('https://sellercentral.amazon.com/oauth');
    });
  });

  describe('getAvailablePlatforms', () => {
    it('calls apiClient.get with correct path', async () => {
      const mockPlatforms = { platforms: [{ platform: 'shopify', configured: true, name: 'Shopify' }] };
      mockApiClient.get.mockResolvedValue(mockPlatforms);

      const result = await vopiService.getAvailablePlatforms();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/platforms/available');
      expect(result).toEqual(mockPlatforms);
    });
  });

  describe('testConnection', () => {
    it('calls apiClient.post with connection ID', async () => {
      const mockResponse = { status: 'ok', message: 'Connection is healthy' };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await vopiService.testConnection('conn-123');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/connections/conn-123/test');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('disconnectConnection', () => {
    it('calls apiClient.delete with connection ID', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await vopiService.disconnectConnection('conn-123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/connections/conn-123');
    });
  });

  describe('pushToListing', () => {
    it('calls apiClient.post with request body', async () => {
      const mockResponse = { listingId: 'listing-1', status: 'created' };
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = { jobId: 'job-123', connectionId: 'conn-1', options: { publishAsDraft: true } };
      const result = await vopiService.pushToListing(request);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/listings/push', request);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getListing', () => {
    it('calls apiClient.get with listing ID', async () => {
      const mockListing = { id: 'listing-1', status: 'active' };
      mockApiClient.get.mockResolvedValue(mockListing);

      const result = await vopiService.getListing('listing-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/listings/listing-1');
      expect(result).toEqual(mockListing);
    });
  });

  describe('updateProductMetadata', () => {
    it('calls apiClient.patch with job ID and updates', async () => {
      const mockMetadata = {
        transcript: 'Test transcript',
        product: {
          title: 'Updated Product',
          description: 'A test product',
          bulletPoints: ['Point 1'],
          confidence: { overall: 0.9, title: 0.9, description: 0.9 },
        },
        platforms: { shopify: {}, amazon: {}, ebay: {} },
        extractedAt: new Date().toISOString(),
      };
      mockApiClient.patch.mockResolvedValue(mockMetadata);

      const result = await vopiService.updateProductMetadata('job-123', { title: 'Updated Product' });

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/v1/jobs/job-123/metadata', { title: 'Updated Product' });
      expect(result).toEqual(mockMetadata);
    });
  });
});
