# API Reference

Complete API endpoint documentation for VOPI.

## Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production** | `https://api.vopi.24rabbit.com` |
| Development | `http://localhost:3000` |

---

## Authentication Endpoints

### Check Available Providers

**Endpoint:** `GET /api/v1/auth/providers`

**Response:**
```json
{
  "google": true,
  "apple": true
}
```

### Initialize OAuth

**Endpoint:** `POST /api/v1/auth/oauth/init`

**Request:**
```json
{
  "provider": "google",
  "redirectUri": "com.yourapp://oauth/callback"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "abc123...",
  "codeVerifier": "xyz789..."
}
```

> **Important:** Store `state` and `codeVerifier` securely - you need them for the callback.

### Exchange Code for Tokens

**Endpoint:** `POST /api/v1/auth/oauth/callback`

**Request:**
```json
{
  "provider": "google",
  "code": "authorization_code_from_redirect",
  "redirectUri": "com.yourapp://oauth/callback",
  "state": "abc123...",
  "codeVerifier": "xyz789...",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceName": "iPhone 15 Pro"
  }
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "creditsBalance": 5
  }
}
```

### Refresh Access Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4...",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

> **Note:** A new refresh token is returned. Store it and discard the old one.

### Get User Profile

**Endpoint:** `GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "emailVerified": true,
  "name": "John Doe",
  "avatarUrl": "https://...",
  "createdAt": "2025-01-23T10:00:00.000Z",
  "lastLoginAt": "2025-01-24T15:30:00.000Z"
}
```

### Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "allDevices": false
}
```

---

## Credits Endpoints

### Get Credit Balance

**Endpoint:** `GET /api/v1/credits/balance`

**Headers:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "balance": 25,
  "transactions": [
    {
      "id": "...",
      "creditsDelta": 5,
      "type": "signup_grant",
      "description": "Welcome bonus: 5 free credits",
      "createdAt": "2025-01-23T10:00:00.000Z"
    }
  ]
}
```

### Get Credit Packs (No Auth)

**Endpoint:** `GET /api/v1/credits/packs`

**Response:**
```json
{
  "packs": [
    { "packType": "CREDIT_1", "credits": 1, "priceUsd": 0.99, "name": "Single Credit" },
    { "packType": "PACK_20", "credits": 20, "priceUsd": 14.99, "name": "20 Credit Pack" },
    { "packType": "PACK_100", "credits": 100, "priceUsd": 59, "name": "100 Credit Pack" },
    { "packType": "PACK_500", "credits": 500, "priceUsd": 199, "name": "500 Credit Pack" }
  ],
  "stripeConfigured": true
}
```

### Estimate Job Cost

**Endpoint:** `POST /api/v1/credits/estimate`

**Request:**
```json
{
  "videoDurationSeconds": 30,
  "frameCount": 8
}
```

**Response:**
```json
{
  "totalCredits": 3,
  "breakdown": [
    { "type": "base", "description": "Base job cost", "credits": 1 },
    { "type": "duration", "description": "30 seconds of video", "credits": 1.5 }
  ],
  "canAfford": true,
  "currentBalance": 25
}
```

### Purchase Credits (Stripe Checkout)

**Endpoint:** `POST /api/v1/credits/checkout`

**Request:**
```json
{
  "packType": "PACK_20",
  "successUrl": "com.yourapp://purchase/success",
  "cancelUrl": "com.yourapp://purchase/cancel"
}
```

**Response:**
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_xxx...",
  "sessionId": "cs_xxx..."
}
```

---

## Upload Endpoints

### Get Presigned Upload URL

**Endpoint:** `POST /api/v1/uploads/presign`

**Request:**
```json
{
  "filename": "product-video.mp4",
  "contentType": "video/mp4",
  "expiresIn": 3600
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/bucket/uploads/uuid.mp4?X-Amz-...",
  "key": "uploads/uuid.mp4",
  "publicUrl": "https://s3.amazonaws.com/bucket/uploads/uuid.mp4",
  "expiresIn": 3600
}
```

### Upload Video to S3

Upload directly to S3 using the presigned URL with a `PUT` request.

**Headers:**
```
Content-Type: video/mp4
```

---

## Job Endpoints

### Create Processing Job

**Endpoint:** `POST /api/v1/jobs`

**Request:**
```json
{
  "videoUrl": "https://s3.amazonaws.com/bucket/uploads/uuid.mp4",
  "config": {
    "stackId": "unified_video_analyzer"
  },
  "callbackUrl": "https://your-server.com/webhook"
}
```

**Available Pipeline Templates (`stackId`):**

| stackId | Description |
|---------|-------------|
| `classic` | Extract frames, score, classify, Stability commercial images |
| `gemini_video` | Gemini video analysis, Stability commercial images |
| `unified_video_analyzer` | Single Gemini call for audio+video, Stability images (recommended) |
| `full_gemini` | Gemini for everything including image generation (no external APIs) |
| `minimal` | Extract and upload frames only, no commercial images |

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "videoUrl": "...",
  "config": {...},
  "createdAt": "2025-01-19T10:00:00.000Z"
}
```

### Poll Job Status

**Endpoint:** `GET /api/v1/jobs/:id/status`

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "classifying",
  "progress": {
    "step": "classifying",
    "percentage": 55,
    "message": "Processing batch 2/4",
    "totalSteps": 7,
    "currentStep": 4
  }
}
```

### Get Download URLs (Required)

**Endpoint:** `GET /api/v1/jobs/:id/download-urls`

Get presigned URLs for accessing job assets. Required because S3 bucket is private.

**Query Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `expiresIn` | 3600 | URL expiration in seconds (60-86400) |

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 3600,
  "frames": [
    {
      "frameId": "frame_00123",
      "downloadUrl": "https://s3.../...?X-Amz-..."
    }
  ],
  "commercialImages": {
    "product_1_variant_hero": {
      "transparent": "https://s3.../...?X-Amz-...",
      "solid": "https://s3.../...?X-Amz-...",
      "real": "https://s3.../...?X-Amz-...",
      "creative": "https://s3.../...?X-Amz-..."
    }
  },
  "productMetadata": {
    "transcript": "This is a beautiful handmade ceramic vase...",
    "product": {...},
    "platforms": {...}
  }
}
```

### Get Product Metadata

**Endpoint:** `GET /api/v1/jobs/:id/metadata`

**Response:**
```json
{
  "transcript": "This is a beautiful handmade ceramic vase...",
  "product": {
    "title": "Handmade Ceramic Vase",
    "description": "Beautiful handcrafted ceramic vase...",
    "bulletPoints": ["Handcrafted", "Food-safe glaze"],
    "confidence": { "overall": 85, "title": 90, "description": 80 }
  },
  "platforms": {
    "shopify": { "title": "...", "descriptionHtml": "..." },
    "amazon": { "item_name": "...", "bullet_point": [...] },
    "ebay": { "title": "...", "aspects": {...} }
  }
}
```

### Update Product Metadata

**Endpoint:** `PATCH /api/v1/jobs/:id/metadata`

**Request:**
```json
{
  "title": "User Edited Title",
  "description": "User edited description...",
  "bulletPoints": ["Updated feature 1", "Updated feature 2"],
  "price": 29.99
}
```

**Response:** Returns full updated `productMetadata` with regenerated platform formats.

---

## Job Status Values

| Status | Description |
|--------|-------------|
| `pending` | Job created, waiting to be processed |
| `downloading` | Downloading video from source |
| `extracting` | Extracting frames from video |
| `scoring` | Calculating frame quality scores |
| `classifying` | AI classification of frames |
| `extracting_product` | Extracting and centering product |
| `generating` | Generating commercial images |
| `completed` | Job finished successfully |
| `failed` | Job failed with error |
| `cancelled` | Job was cancelled |

---

## Commercial Image Versions

### Stability Pipelines (`classic`, `gemini_video`, `unified_video_analyzer`)

| Version | Description |
|---------|-------------|
| `transparent` | PNG with transparent background |
| `solid` | AI-recommended solid color background |
| `real` | Realistic lifestyle setting |
| `creative` | Artistic/promotional style |

### Full Gemini Pipeline (`full_gemini`)

| Version | Description |
|---------|-------------|
| `white-studio` | Clean white background with professional lighting |
| `lifestyle` | Natural lifestyle setting (bathroom, vanity, etc.) |

---

## Error Handling

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "statusCode": 400
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 402 | Payment Required - Insufficient credits |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limits

| Limit | Value |
|-------|-------|
| Max concurrent jobs per user | 3 |
| Max video duration | 5 minutes |
| Max video file size | 500 MB |
| Min polling interval | 3 seconds |

---

## Supported Video Formats

| Format | MIME Type |
|--------|-----------|
| MP4 | `video/mp4` |
| MOV | `video/quicktime` |
| WebM | `video/webm` |
