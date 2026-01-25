import { create } from 'zustand';
import { UploadState, Job, DownloadUrlsResponse } from '../types/vopi.types';

interface UploadStore {
  state: UploadState;
  recentJobs: Job[];

  // Actions
  setState: (state: UploadState) => void;
  addRecentJob: (job: Job) => void;
  clearRecentJobs: () => void;
  reset: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  state: { status: 'idle' },
  recentJobs: [],

  setState: (state) => set({ state }),

  addRecentJob: (job) =>
    set((prev) => ({
      recentJobs: [job, ...prev.recentJobs.slice(0, 9)],
    })),

  clearRecentJobs: () => set({ recentJobs: [] }),

  reset: () => set({ state: { status: 'idle' } }),
}));
