import { useState, useCallback, useRef, useEffect } from 'react';
import { vopiService } from '../services/vopi.service';
import { VOPIConfig } from '../config/vopi.config';
import { UploadState } from '../types/vopi.types';
import { capitalizeFirst } from '../utils/strings';

interface VideoFile {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

export function useVOPIUpload() {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCancelledRef = useRef(false);
  const currentJobIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const safeSetState = useCallback((newState: UploadState) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const uploadAndProcess = useCallback(
    async (video: VideoFile, stackId = 'unified_video_analyzer') => {
      isCancelledRef.current = false;
      cleanup();

      try {
        // Step 1: Get presigned URL
        safeSetState({ status: 'uploading', progress: 0 });

        const filename = video.fileName || 'video.mp4';
        const contentType = video.mimeType || 'video/mp4';

        const presign = await vopiService.getPresignedUrl(filename, contentType);

        if (isCancelledRef.current) return;

        // Step 2: Upload to S3
        safeSetState({ status: 'uploading', progress: 0.5 });

        await vopiService.uploadFile(
          presign.uploadUrl,
          video.uri,
          contentType,
          (progress) => {
            if (!isCancelledRef.current) {
              safeSetState({ status: 'uploading', progress });
            }
          }
        );

        if (isCancelledRef.current) return;

        // Step 3: Create job
        safeSetState({ status: 'processing', jobId: '', progress: 0, step: 'Creating job...' });

        const job = await vopiService.createJob(presign.publicUrl, { stackId });
        currentJobIdRef.current = job.id;

        if (isCancelledRef.current) {
          await vopiService.cancelJob(job.id).catch(() => {});
          return;
        }

        safeSetState({ status: 'processing', jobId: job.id, progress: 0, step: 'Starting...' });

        // Step 4: Poll for completion
        let attempts = 0;

        const pollStatus = async () => {
          if (isCancelledRef.current || !isMountedRef.current) {
            cleanup();
            return;
          }

          attempts++;
          if (attempts > VOPIConfig.maxPollingAttempts) {
            cleanup();
            safeSetState({ status: 'error', message: 'Job timed out' });
            return;
          }

          try {
            const status = await vopiService.getJobStatus(job.id);

            safeSetState({
              status: 'processing',
              jobId: job.id,
              progress: status.progress?.percentage || 0,
              step: status.progress?.message || capitalizeFirst(status.status),
            });

            if (status.status === 'completed') {
              cleanup();
              await handleJobComplete(job.id);
            } else if (status.status === 'failed' || status.status === 'cancelled') {
              cleanup();
              safeSetState({ status: 'error', message: `Job ${status.status}` });
            }
          } catch {
            // Continue polling on transient errors
          }
        };

        // Start polling
        pollStatus();
        pollingRef.current = setInterval(pollStatus, VOPIConfig.pollingInterval);
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : 'Unknown error';
        safeSetState({ status: 'error', message });
      }
    },
    [cleanup, safeSetState]
  );

  const handleJobComplete = async (jobId: string) => {
    try {
      const [job, downloadUrls] = await Promise.all([
        vopiService.getJob(jobId),
        vopiService.getDownloadUrls(jobId),
      ]);

      safeSetState({
        status: 'completed',
        job,
        downloadUrls,
      });
    } catch {
      safeSetState({
        status: 'error',
        message: 'Failed to fetch results',
      });
    }
  };

  const cancel = useCallback(async () => {
    isCancelledRef.current = true;
    cleanup();

    if (currentJobIdRef.current) {
      await vopiService.cancelJob(currentJobIdRef.current).catch(() => {});
    }

    safeSetState({ status: 'cancelled' });
  }, [cleanup, safeSetState]);

  const reset = useCallback(() => {
    cleanup();
    isCancelledRef.current = false;
    currentJobIdRef.current = null;
    safeSetState({ status: 'idle' });
  }, [cleanup, safeSetState]);

  return {
    state,
    uploadAndProcess,
    cancel,
    reset,
  };
}
