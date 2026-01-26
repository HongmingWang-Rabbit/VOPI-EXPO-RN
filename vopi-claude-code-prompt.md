# VOPI Mobile App - Claude Code Project Prompt

## Project Overview

Build **VOPI (Video to Product Instant)** - a mobile app that converts product videos into e-commerce listings. Users record themselves describing products while the AI generates clean images, titles, descriptions, and syncs to Shopify.

## Tech Stack Requirements

### Core Framework
- **Expo SDK 52+** (latest stable)
- **React Native 0.77+** with New Architecture enabled (`newArchEnabled: true`)
- **Expo Router v3** for file-based navigation
- **TypeScript** (strict mode)

### State Management
- **Zustand** for global state (lightweight, no boilerplate)
- **React Query / TanStack Query** for server state and API caching

### Key Expo Packages (use latest SDK 52 APIs)
```bash
npx expo install expo-camera expo-av expo-image-manipulator expo-file-system expo-image-picker expo-secure-store expo-haptics expo-linear-gradient
```

### Additional Dependencies
```bash
npm install zustand @tanstack/react-query axios nativewind tailwindcss
```

## Project Structure

Follow Expo Router file-based routing with feature-based organization:

```
vopi/
├── app/                          # Expo Router pages (routes only)
│   ├── _layout.tsx               # Root layout (fonts, providers, splash)
│   ├── index.tsx                 # Landing/onboarding redirect
│   ├── (auth)/                   # Auth route group
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── _layout.tsx           # Tab navigator config
│   │   ├── index.tsx             # Home/Dashboard
│   │   ├── capture.tsx           # Video capture screen
│   │   ├── products.tsx          # Product listings
│   │   └── settings.tsx          # Settings
│   ├── capture/                  # Capture flow screens
│   │   ├── [id].tsx              # Edit specific capture
│   │   ├── preview.tsx           # Preview before processing
│   │   └── processing.tsx        # AI processing status
│   ├── product/
│   │   └── [id].tsx              # Product detail/edit
│   └── +not-found.tsx            # 404 handler
│
├── src/                          # All non-route code
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Base UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── camera/               # Camera-related components
│   │   │   ├── CameraView.tsx
│   │   │   ├── RecordButton.tsx
│   │   │   └── CameraControls.tsx
│   │   ├── product/              # Product-related components
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   └── ImageGallery.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── SafeAreaWrapper.tsx
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useCamera.ts          # Camera permission & control
│   │   ├── useVideoRecording.ts  # Video recording logic
│   │   ├── useImageProcessing.ts # Image manipulation
│   │   └── useAuth.ts            # Authentication hook
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts          # Auth state
│   │   ├── captureStore.ts       # Capture flow state
│   │   ├── productStore.ts       # Products state
│   │   └── settingsStore.ts      # App settings
│   │
│   ├── services/                 # API & external services
│   │   ├── api/
│   │   │   ├── client.ts         # Axios instance
│   │   │   ├── auth.ts           # Auth endpoints
│   │   │   ├── products.ts       # Product endpoints
│   │   │   └── ai.ts             # AI processing endpoints
│   │   ├── shopify/
│   │   │   └── shopifyService.ts # Shopify integration
│   │   └── storage/
│   │       └── secureStorage.ts  # expo-secure-store wrapper
│   │
│   ├── lib/                      # Utilities & helpers
│   │   ├── utils.ts              # General utilities
│   │   ├── validation.ts         # Form validation
│   │   ├── imageUtils.ts         # Image processing helpers
│   │   └── constants.ts          # App constants
│   │
│   └── types/                    # TypeScript types
│       ├── api.ts                # API response types
│       ├── product.ts            # Product types
│       ├── capture.ts            # Capture types
│       └── navigation.ts         # Navigation types
│
├── assets/                       # Static assets
│   ├── images/
│   └── fonts/
│
├── app.json                      # Expo config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json                 # TypeScript config
└── package.json
```

## Critical Implementation Details

### 1. Root Layout (`app/_layout.tsx`)

```typescript
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/authStore';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add custom fonts here
  });
  
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(); // Restore auth state from secure storage
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </QueryClientProvider>
  );
}
```

### 2. Camera Implementation (`src/components/camera/CameraView.tsx`)

Use the latest `expo-camera` API (SDK 52+):

```typescript
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  onVideoRecorded: (uri: string) => void;
}

export function ProductCamera({ onVideoRecorded }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const startRecording = async () => {
    if (!cameraRef.current) return;
    
    setIsRecording(true);
    const video = await cameraRef.current.recordAsync({
      maxDuration: 60, // 60 second max
      // quality is set via videoQuality prop on CameraView
    });
    
    if (video?.uri) {
      onVideoRecorded(video.uri);
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  // Handle permissions...
  
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
        videoQuality="1080p"
      >
        {/* Camera UI overlay */}
      </CameraView>
    </View>
  );
}
```

### 3. Zustand Store Pattern (`src/stores/authStore.ts`)

```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Custom storage adapter for expo-secure-store
const secureStorage = {
  getItem: async (name: string) => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

interface AuthState {
  status: 'idle' | 'authenticated' | 'unauthenticated';
  token: string | null;
  user: User | null;
  
  // Actions
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      token: null,
      user: null,

      signIn: (token, user) => {
        set({ status: 'authenticated', token, user });
      },

      signOut: () => {
        set({ status: 'unauthenticated', token: null, user: null });
      },

      hydrate: async () => {
        // Called on app start to restore auth state
        const token = get().token;
        if (token) {
          set({ status: 'authenticated' });
        } else {
          set({ status: 'unauthenticated' });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
```

### 4. Image Manipulation (`src/hooks/useImageProcessing.ts`)

```typescript
import { useImageManipulator, FlipType, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export function useImageProcessing() {
  const processProductImage = async (uri: string) => {
    const context = useImageManipulator(uri);
    
    // Resize to standard product image size
    context.resize({ width: 1200, height: 1200 });
    
    const result = await context.renderAsync();
    const savedImage = await result.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.9,
    });
    
    return savedImage.uri;
  };

  const extractFrameFromVideo = async (videoUri: string, timeMs: number) => {
    // Use expo-av or ffmpeg for frame extraction
    // This will need backend processing or a native module
  };

  return {
    processProductImage,
    extractFrameFromVideo,
  };
}
```

### 5. API Client Setup (`src/services/api/client.ts`)

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);
```

### 6. Tab Layout (`app/(tabs)/_layout.tsx`)

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

## App Configuration (`app.json`)

```json
{
  "expo": {
    "name": "VOPI",
    "slug": "vopi",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "vopi",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.vopi.app",
      "infoPlist": {
        "NSCameraUsageDescription": "VOPI needs camera access to record product videos",
        "NSMicrophoneUsageDescription": "VOPI needs microphone access for voice descriptions",
        "NSPhotoLibraryUsageDescription": "VOPI needs photo library access to save product images"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.vopi.app",
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow VOPI to access your camera for recording product videos",
          "microphonePermission": "Allow VOPI to access your microphone for voice descriptions",
          "recordAudioAndroid": true
        }
      ],
      "expo-secure-store"
    ]
  }
}
```

## TypeScript Configuration (`tsconfig.json`)

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/hooks/*": ["src/hooks/*"],
      "@/stores/*": ["src/stores/*"],
      "@/services/*": ["src/services/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

## Key Features to Implement

### Phase 1: Core Capture Flow
1. **Camera Recording** - Record product video with voice description
2. **Video Preview** - Review recorded video before processing
3. **Frame Extraction** - Extract key frames from video for product images
4. **Audio Transcription** - Send audio to backend for transcription

### Phase 2: AI Processing
1. **Background Removal** - Call backend API for AI background removal
2. **Image Enhancement** - Clean up extracted product images
3. **Content Generation** - Generate title, description from transcription
4. **Product Preview** - Show AI-generated listing for review

### Phase 3: Shopify Integration
1. **OAuth Flow** - Connect user's Shopify store
2. **Product Sync** - Push completed listings to Shopify
3. **Inventory Management** - Track synced products
4. **Error Handling** - Handle sync failures gracefully

## Important Notes

1. **New Architecture**: SDK 52+ enables New Architecture by default. Keep `newArchEnabled: true`.

2. **expo-camera**: Use `CameraView` component (not legacy `Camera`). The legacy API was removed in SDK 52.

3. **File-based Routing**: Keep route files minimal - only navigation logic. Put all business logic in `src/`.

4. **No Providers Needed for Zustand**: Unlike Redux, Zustand doesn't require wrapping the app in providers.

5. **Expo Router Typed Routes**: Enable typed routes in `app.json`:
   ```json
   {
     "expo": {
       "experiments": {
         "typedRoutes": true
       }
     }
   }
   ```

6. **Environment Variables**: Use `EXPO_PUBLIC_` prefix for client-accessible env vars:
   ```
   EXPO_PUBLIC_API_URL=https://api.vopi.com
   EXPO_PUBLIC_SHOPIFY_API_KEY=xxx
   ```

## Commands to Run

```bash
# Create project
npx create-expo-app@latest vopi --template tabs

# Install dependencies
npx expo install expo-camera expo-av expo-image-manipulator expo-file-system expo-image-picker expo-secure-store expo-haptics expo-linear-gradient

npm install zustand @tanstack/react-query axios nativewind tailwindcss

# Development
npx expo start

# Build
eas build --platform ios
eas build --platform android
```

## Development Guidelines

1. **Always check Expo docs** before implementing native features
2. **Use TypeScript strictly** - no `any` types
3. **Keep components small** - single responsibility
4. **Extract hooks** for reusable logic
5. **Handle loading/error states** in all async operations
6. **Test on both iOS and Android** regularly
7. **Use `expo-doctor`** to validate dependencies
