import { create } from 'zustand';

interface CaptureState {
  videoUri: string | null;
  isRecording: boolean;
  recordingDuration: number;

  // Actions
  setVideoUri: (uri: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  videoUri: null,
  isRecording: false,
  recordingDuration: 0,

  setVideoUri: (uri) => set({ videoUri: uri }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),
  reset: () => set({
    videoUri: null,
    isRecording: false,
    recordingDuration: 0,
  }),
}));
