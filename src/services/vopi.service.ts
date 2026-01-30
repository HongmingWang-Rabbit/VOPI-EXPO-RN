import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { apiClient } from './api.client';
import { VOPIConfig } from '../config/vopi.config';
import {
  PresignResponse,
  Job,
  JobConfig,
  JobStatus,
  DownloadUrlsResponse,
  CreditBalance,
  CreditPack,
  CostEstimate,
  ProductMetadata,
  PlatformInfo,
  PlatformConnection,
  ListingDetail,
  PushToListingRequest,
  PushToListingResponse,
} from '../types/vopi.types';

export const vopiService = {
  // Auth
  getProviders: () => apiClient.get<{ google: boolean; apple: boolean }>('/api/v1/auth/providers'),

  // Credits
  getBalance: () => apiClient.get<CreditBalance>('/api/v1/credits/balance'),

  getPacks: () => apiClient.get<{ packs: CreditPack[]; stripeConfigured: boolean }>('/api/v1/credits/packs'),

  estimateCost: (videoDurationSeconds: number, frameCount?: number) =>
    apiClient.post<CostEstimate>('/api/v1/credits/estimate', {
      videoDurationSeconds,
      frameCount,
    }),

  createCheckout: (packType: string, successUrl: string, cancelUrl: string) =>
    apiClient.post<{ checkoutUrl: string; sessionId: string }>('/api/v1/credits/checkout', {
      packType,
      successUrl,
      cancelUrl,
    }),

  // Uploads
  getPresignedUrl: (filename: string, contentType = 'video/mp4') =>
    apiClient.post<PresignResponse>('/api/v1/uploads/presign', {
      filename,
      contentType,
    }),

  uploadFile: async (
    uploadUrl: string,
    fileUri: string,
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    if (__DEV__) {
      console.log('[VOPI] Starting file upload:', { fileUri, contentType });
    }

    // Create file reference using new expo-file-system API
    const file = new File(fileUri);

    // Check if file exists
    if (!file.exists) {
      throw new Error('File not found');
    }

    // Validate file size (reject empty or suspiciously small files)
    const fileSize = file.size;
    if (fileSize === 0) {
      throw new Error('File is empty - recording may have failed');
    }
    if (fileSize < 1000) {
      throw new Error('File appears to be corrupted (too small)');
    }

    if (__DEV__) {
      console.log('[VOPI] File validated:', { size: fileSize });
    }

    // Upload to S3 with retry logic using expo/fetch with File object directly
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), VOPIConfig.uploadTimeout);

      try {
        // Use expo/fetch which supports File objects natively
        const uploadResponse = await expoFetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
          },
          body: file,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (uploadResponse.ok) {
          if (__DEV__) {
            console.log('[VOPI] File upload completed successfully');
          }
          onProgress?.(1);
          return;
        }

        // Retry on 5xx server errors
        if (uploadResponse.status >= 500 && attempt < MAX_RETRIES - 1) {
          if (__DEV__) {
            console.warn('[VOPI] Upload failed, retrying:', { status: uploadResponse.status, attempt: attempt + 1 });
          }
          lastError = new Error(`Upload failed with status ${uploadResponse.status}`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }

        if (__DEV__) {
          console.error('[VOPI] Upload failed permanently:', { status: uploadResponse.status });
        }
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Upload timed out - please try again with a smaller file or better connection');
        }

        // Retry on network errors
        if (error instanceof TypeError && attempt < MAX_RETRIES - 1) {
          lastError = new Error('Network error during upload');
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error('Upload failed after retries');
  },

  // Jobs
  createJob: async (videoUrl: string, config?: JobConfig) => {
    if (__DEV__) {
      console.log('[VOPI] Creating job:', { videoUrl: videoUrl.slice(0, 50) + '...', config });
    }
    const result = await apiClient.post<Job>('/api/v1/jobs', { videoUrl, config });
    if (__DEV__) {
      console.log('[VOPI] Job created:', { jobId: result.id, status: result.status });
    }
    return result;
  },

  getJob: (jobId: string) => apiClient.get<Job>(`/api/v1/jobs/${jobId}`),

  getJobStatus: (jobId: string) => apiClient.get<JobStatus>(`/api/v1/jobs/${jobId}/status`),

  cancelJob: (jobId: string) =>
    apiClient.post<{ id: string; status: string; message: string }>(`/api/v1/jobs/${jobId}/cancel`),

  deleteJob: (jobId: string) =>
    apiClient.delete<void>(`/api/v1/jobs/${jobId}`),

  deleteJobImage: (jobId: string, frameId: string, version: string) =>
    apiClient.delete<void>(`/api/v1/jobs/${jobId}/images/${frameId}/${version}`),

  listJobs: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get<{ jobs: Job[]; total: number }>('/api/v1/jobs', params as Record<string, string | number>),

  getDownloadUrls: (jobId: string, expiresIn = 3600) =>
    apiClient.get<DownloadUrlsResponse>(`/api/v1/jobs/${jobId}/download-urls`, { expiresIn }),

  // Metadata
  getProductMetadata: (jobId: string) =>
    apiClient.get<ProductMetadata>(`/api/v1/jobs/${jobId}/metadata`),

  updateProductMetadata: (jobId: string, updates: Partial<ProductMetadata['product']>) =>
    apiClient.patch<ProductMetadata>(`/api/v1/jobs/${jobId}/metadata`, updates),

  // Platforms & Connections
  getConnections: () =>
    apiClient.get<{ connections: PlatformConnection[] }>('/api/v1/connections'),

  getShopifyAuthUrl: (shop: string) =>
    apiClient.get<{ authUrl: string }>(
      '/api/v1/oauth/shopify/authorize',
      { shop, response_type: 'json' }
    ).then((data) => data.authUrl),

  getAmazonAuthUrl: () =>
    apiClient.get<{ authUrl: string }>(
      '/api/v1/oauth/amazon/authorize',
      { response_type: 'json' }
    ).then((data) => data.authUrl),

  getAvailablePlatforms: () =>
    apiClient.get<{ platforms: PlatformInfo[] }>('/api/v1/platforms/available'),

  testConnection: (connectionId: string) =>
    apiClient.post<{ status: string; message?: string }>(`/api/v1/connections/${connectionId}/test`),

  disconnectConnection: (connectionId: string) =>
    apiClient.delete<void>(`/api/v1/connections/${connectionId}`),

  // Listings
  getListing: (listingId: string) =>
    apiClient.get<ListingDetail>(`/api/v1/listings/${listingId}`),

  pushToListing: (request: PushToListingRequest) =>
    apiClient.post<PushToListingResponse>('/api/v1/listings/push', request),
};
