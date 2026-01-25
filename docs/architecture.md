# Architecture

Overview of VOPI integration flow and system architecture.

---

## Complete Integration Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │   VOPI API      │     │   S3 Storage    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. OAuth login (Google/Apple)                │
         │──────────────────────>│                       │
         │                       │                       │
         │  { accessToken, refreshToken, user }          │
         │<──────────────────────│                       │
         │                       │                       │
         │  2. Check credit balance                      │
         │──────────────────────>│                       │
         │                       │                       │
         │  { balance: 5 }       │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  3. Get presigned upload URL                  │
         │──────────────────────>│                       │
         │                       │                       │
         │  { uploadUrl, publicUrl }                     │
         │<──────────────────────│                       │
         │                       │                       │
         │  4. Upload video directly to S3               │
         │─────────────────────────────────────────────>│
         │                       │                       │
         │  5. Create job with publicUrl                 │
         │──────────────────────>│                       │
         │                       │                       │
         │  { jobId, status: pending }                   │
         │<──────────────────────│                       │
         │                       │                       │
         │  6. Poll status OR receive webhook            │
         │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                       │
         │                       │                       │
         │  7. Get download URLs (presigned)             │
         │──────────────────────>│                       │
         │                       │                       │
         │  { frames, commercialImages }                 │
         │<──────────────────────│                       │
         │                       │                       │
         │  8. Download images using presigned URLs      │
         │─────────────────────────────────────────────>│
```

> **Note:** The S3 bucket is private. Direct URLs in job results are not accessible. Use the `/jobs/:id/download-urls` endpoint to get time-limited presigned URLs.

---

## Pipeline Templates

VOPI offers multiple processing pipelines optimized for different use cases:

### `unified_video_analyzer` (Recommended)

Single Gemini call for audio+video analysis, Stability AI for image generation.

```
Video → Gemini Analysis → Frame Extraction → Stability Images
        (audio + video)
```

**Best for:** Most use cases, balanced quality and speed.

### `classic`

Traditional pipeline with separate scoring and classification steps.

```
Video → Frame Extraction → Scoring → Classification → Stability Images
```

**Best for:** When you need detailed frame-by-frame analysis.

### `gemini_video`

Gemini-powered video analysis with Stability images.

```
Video → Gemini Video Analysis → Frame Selection → Stability Images
```

**Best for:** Complex product videos with multiple angles.

### `full_gemini`

End-to-end Gemini processing including image generation.

```
Video → Gemini Analysis → Gemini Image Generation
```

**Best for:** When you want consistent AI styling across all outputs.

### `minimal`

Extract and upload frames only, no commercial image generation.

```
Video → Frame Extraction → Upload
```

**Best for:** When you only need raw frames.

---

## Project Structure

Recommended project structure for Expo/React Native integration:

```
src/
├── config/
│   └── vopi.config.ts       # API configuration
├── contexts/
│   └── AuthContext.tsx      # Authentication state
├── hooks/
│   ├── useVOPIUpload.ts     # Upload and processing hook
│   └── useCredits.ts        # Credits management hook
├── services/
│   ├── api.client.ts        # HTTP client with auth
│   └── vopi.service.ts      # VOPI API methods
├── types/
│   └── vopi.types.ts        # TypeScript types
├── components/
│   ├── VideoPicker.tsx      # Video selection
│   └── UploadProgress.tsx   # Progress indicator
└── screens/
    ├── LoginScreen.tsx      # OAuth login
    ├── HomeScreen.tsx       # Main interface
    └── ResultsScreen.tsx    # Display results
```

---

## State Management

### Authentication State

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
```

### Upload State

```typescript
type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number }
  | { status: 'processing'; jobId: string; progress: number; step: string }
  | { status: 'completed'; job: Job; downloadUrls: DownloadUrlsResponse }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };
```

---

## Processing Flow States

```
idle → uploading → processing → completed
                              ↘ error
                              ↘ cancelled
```

### Job Status Progression

```
pending → downloading → extracting → scoring → classifying → extracting_product → generating → completed
                                                                                            ↘ failed
                                                                                            ↘ cancelled
```

---

## Security Considerations

1. **Token Storage**: Always use secure storage (Keychain/Keystore/SecureStore)
2. **PKCE Flow**: Use code verifier for OAuth to prevent authorization code interception
3. **State Validation**: Always validate OAuth state parameter to prevent CSRF
4. **Presigned URLs**: All S3 URLs are time-limited and require no credentials
5. **HTTPS**: All API communication uses HTTPS
