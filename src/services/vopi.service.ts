import * as FileSystem from 'expo-file-system';
import { apiClient } from './api.client';
import {
  PresignResponse,
  Job,
  JobStatus,
  DownloadUrlsResponse,
  CreditBalance,
  CreditPack,
  CostEstimate,
  ProductMetadata,
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
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Read file as base64 and upload using fetch
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });

    // Convert base64 to blob
    const binaryString = atob(fileContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: contentType });

    // Upload to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    onProgress?.(1);
  },

  // Jobs
  createJob: (videoUrl: string, config?: { stackId?: string }) =>
    apiClient.post<Job>('/api/v1/jobs', { videoUrl, config }),

  getJob: (jobId: string) => apiClient.get<Job>(`/api/v1/jobs/${jobId}`),

  getJobStatus: (jobId: string) => apiClient.get<JobStatus>(`/api/v1/jobs/${jobId}/status`),

  cancelJob: (jobId: string) => apiClient.delete<{ id: string; status: string; message: string }>(`/api/v1/jobs/${jobId}`),

  listJobs: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get<{ jobs: Job[]; total: number }>('/api/v1/jobs', params as Record<string, string | number>),

  getDownloadUrls: (jobId: string, expiresIn = 3600) =>
    apiClient.get<DownloadUrlsResponse>(`/api/v1/jobs/${jobId}/download-urls`, { expiresIn }),

  // Metadata
  getProductMetadata: (jobId: string) =>
    apiClient.get<ProductMetadata>(`/api/v1/jobs/${jobId}/metadata`),

  updateProductMetadata: (jobId: string, updates: Partial<ProductMetadata['product']>) =>
    apiClient.patch<ProductMetadata>(`/api/v1/jobs/${jobId}/metadata`, updates),
};
