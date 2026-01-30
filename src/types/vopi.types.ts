// Presign
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
}

// Job Config
export interface JobConfig {
  stackId?: string;
  frameCount?: number;
  quality?: 'low' | 'medium' | 'high';
  [key: string]: unknown; // Allow additional properties
}

// Job
export type JobStatusType =
  | 'pending'
  | 'downloading'
  | 'extracting'
  | 'scoring'
  | 'classifying'
  | 'extracting_product'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobProgress {
  step: string;
  percentage: number;
  message?: string;
  totalSteps?: number;
  currentStep?: number;
}

export interface Job {
  id: string;
  status: JobStatusType;
  videoUrl: string;
  config?: JobConfig;
  progress?: JobProgress;
  result?: {
    variantsDiscovered?: number;
    framesAnalyzed?: number;
    finalFrames?: string[];
    commercialImages?: Record<string, Record<string, string>>;
  };
  error?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface JobStatus {
  id: string;
  status: JobStatusType;
  progress?: JobProgress;
  createdAt: string;
  updatedAt?: string;
}

// Download URLs
export interface DownloadUrlsResponse {
  jobId: string;
  expiresIn: number;
  frames: Array<{
    frameId: string;
    downloadUrl: string;
  }>;
  commercialImages: Record<string, Record<string, string>>;
  productMetadata?: ProductMetadata;
}

// Credits
export interface CreditBalance {
  balance: number;
  transactions?: Array<{
    id: string;
    creditsDelta: number;
    type: string;
    description?: string;
    createdAt: string;
  }>;
}

export interface CreditPack {
  packType: string;
  credits: number;
  priceUsd: number;
  name: string;
  available: boolean;
}

export interface CostEstimate {
  totalCredits: number;
  breakdown: Array<{
    type: string;
    description: string;
    credits: number;
  }>;
  canAfford?: boolean;
  currentBalance?: number;
}

// Product Metadata
export interface ProductMetadata {
  transcript: string;
  product: {
    title: string;
    description: string;
    shortDescription?: string;
    bulletPoints: string[];
    brand?: string;
    category?: string;
    materials?: string[];
    color?: string;
    price?: number;
    currency?: string;
    keywords?: string[];
    gender?: string;
    targetAudience?: string;
    ageGroup?: string;
    style?: string;
    modelNumber?: string;
    compareAtPrice?: number;
    costPerItem?: number;
    countryOfOrigin?: string;
    manufacturer?: string;
    pattern?: string;
    productType?: string;
    confidence: {
      overall: number;
      title: number;
      description: number;
    };
  };
  platforms: {
    shopify: Record<string, unknown>;
    amazon: Record<string, unknown>;
    ebay: Record<string, unknown>;
  };
  extractedAt: string;
}

// Upload State
export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'processing'; jobId: string; progress: number; step: string }
  | { status: 'completed'; job: Job; downloadUrls: DownloadUrlsResponse }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

// Platforms & Connections
export type PlatformType = 'shopify' | 'amazon' | 'ebay';

export interface PlatformInfo {
  platform: PlatformType;
  configured: boolean;
  name: string;
}

export interface PlatformConnection {
  id: string;
  platform: PlatformType;
  platformAccountId: string;
  status: 'active' | 'expired' | 'revoked';
  metadata?: Record<string, unknown>;
  lastError?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ListingDetail {
  id: string;
  connectionId: string;
  jobId: string;
  platform: PlatformType;
  platformProductId?: string;
  status: string;
  metadata?: Record<string, unknown>;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushToListingRequest {
  jobId: string;
  connectionId: string;
  options?: {
    publishAsDraft?: boolean;
    overrideMetadata?: Partial<ProductMetadata['product']>;
  };
}

export interface PushToListingResponse {
  listingId: string;
  status: string;
  platformProductId?: string;
  message?: string;
}

// User
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  creditsBalance: number;
}
