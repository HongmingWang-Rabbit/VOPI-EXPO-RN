# Best Practices

Guidelines for optimal VOPI integration.

---

## Authentication

1. **Store tokens securely**: Use Keychain (iOS) / Keystore (Android) / SecureStore (Expo)
2. **Implement token refresh**: Check token expiry before requests, refresh proactively
3. **Handle 401 errors**: Refresh token and retry, or redirect to login
4. **Clear tokens on logout**: Remove all stored tokens on logout

---

## Video Upload

1. **Validate video before upload**: Check file size, format, and duration on the client
2. **Show upload progress**: Use multipart upload progress callbacks
3. **Handle network interruptions**: Implement retry logic for uploads
4. **Compress if needed**: Consider client-side compression for large videos

### Validation Example

```typescript
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION = 5 * 60; // 5 minutes
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

function validateVideo(file: { size: number; type: string; duration?: number }) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Video must be under 500 MB');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported video format');
  }

  if (file.duration && file.duration > MAX_DURATION) {
    throw new Error('Video must be under 5 minutes');
  }
}
```

---

## Job Processing

1. **Check credits first**: Use `/credits/estimate` before creating jobs
2. **Use webhooks when possible**: More efficient than polling
3. **Poll at reasonable intervals**: 3-5 seconds is recommended
4. **Implement exponential backoff**: For retries on transient failures
5. **Cache results**: Store completed job results locally

### Polling Example

```typescript
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_ATTEMPTS = 200;   // ~10 minutes max

async function pollJobStatus(jobId: string): Promise<Job> {
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    const status = await vopiService.getJobStatus(jobId);

    if (status.status === 'completed') {
      return await vopiService.getJob(jobId);
    }

    if (status.status === 'failed' || status.status === 'cancelled') {
      throw new Error(`Job ${status.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    attempts++;
  }

  throw new Error('Job timed out');
}
```

---

## UX Recommendations

1. **Show progress indicators**: Display current step and percentage
2. **Provide cancel option**: Allow users to cancel pending jobs
3. **Handle background processing**: Support app backgrounding during upload/processing
4. **Display intermediate results**: Show frames as they become available

### Progress Display

```typescript
function getProgressMessage(status: JobStatus): string {
  const steps: Record<string, string> = {
    pending: 'Waiting to start...',
    downloading: 'Preparing video...',
    extracting: 'Extracting frames...',
    scoring: 'Analyzing quality...',
    classifying: 'Identifying products...',
    extracting_product: 'Processing products...',
    generating: 'Creating images...',
  };

  return status.progress?.message || steps[status.status] || 'Processing...';
}
```

---

## Error Handling

### Retry Strategy

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx)
      if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### Common Error Handling

```typescript
async function handleAPIError(error: unknown) {
  if (error instanceof APIError) {
    switch (error.statusCode) {
      case 401:
        // Token expired, try refresh
        const newToken = await refreshAccessToken();
        if (!newToken) {
          // Redirect to login
          navigation.navigate('Login');
        }
        break;

      case 402:
        // Insufficient credits
        Alert.alert('Insufficient Credits', 'Please purchase more credits to continue.');
        break;

      case 429:
        // Rate limited
        Alert.alert('Please Wait', 'Too many requests. Please try again in a moment.');
        break;

      default:
        Alert.alert('Error', error.message);
    }
  }
}
```

---

## Performance Tips

1. **Parallel requests**: Fetch independent data concurrently
2. **Cache presigned URLs**: Reuse URLs until they expire
3. **Lazy load images**: Load thumbnails first, full images on demand
4. **Background fetch**: Continue processing when app is backgrounded

### Parallel Fetching

```typescript
// Good: Parallel requests
const [balance, packs] = await Promise.all([
  vopiService.getBalance(),
  vopiService.getPacks(),
]);

// Bad: Sequential requests
const balance = await vopiService.getBalance();
const packs = await vopiService.getPacks();
```

---

## Testing

1. **Mock API responses**: Use MSW or similar for consistent testing
2. **Test error states**: Verify error handling works correctly
3. **Test token refresh**: Ensure seamless token renewal
4. **Test offline behavior**: Handle network interruptions gracefully
