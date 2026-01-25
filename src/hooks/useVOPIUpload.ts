import { useState, useCallback, useRef } from 'react';
import { vopiService } from '../services/vopi.service';
import { VOPIConfig } from '../config/vopi.config';
import { UploadState, Job } from '../types/vopi.types';

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
        setState({ status: 'uploading', progress: 0 });

        const filename = video.fileName || 'video.mp4';
        const contentType = video.mimeType || 'video/mp4';

        const presign = await vopiService.getPresignedUrl(filename, contentType);

        if (isCancelledRef.current) return;

        // Step 2: Upload to S3
        setState({ status: 'uploading', progress: 0.5 });

        await vopiService.uploadFile(
          presign.uploadUrl,
          video.uri,
          contentType,
          (progress) => {
            if (!isCancelledRef.current) {
              setState({ status: 'uploading', progress });
            }
          }
        );

        if (isCancelledRef.current) return;

        // Step 3: Create job
        setState({ status: 'processing', jobId: '', progress: 0, step: 'Creating job...' });

        const job = await vopiService.createJob(presign.publicUrl, { stackId });
        currentJobIdRef.current = job.id;

        if (isCancelledRef.current) {
          await vopiService.cancelJob(job.id);
          return;
        }

        setState({ status: 'processing', jobId: job.id, progress: 0, step: 'Starting...' });

        // Step 4: Poll for completion
        let attempts = 0;

        const pollStatus = async () => {
          if (isCancelledRef.current) {
            cleanup();
            return;
          }

          attempts++;
          if (attempts > VOPIConfig.maxPollingAttempts) {
            cleanup();
            setState({ status: 'error', message: 'Job timed out' });
            return;
          }

          try {
            const status = await vopiService.getJobStatus(job.id);

            setState({
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
              setState({ status: 'error', message: `Job ${status.status}` });
            }
          } catch (error) {
            console.warn('Polling error:', error);
            // Continue polling on transient errors
          }
        };

        // Start polling
        pollStatus();
        pollingRef.current = setInterval(pollStatus, VOPIConfig.pollingInterval);
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : 'Unknown error';
        setState({ status: 'error', message });
      }
    },
    [cleanup]
  );

  const handleJobComplete = async (jobId: string) => {
    try {
      const [job, downloadUrls] = await Promise.all([
        vopiService.getJob(jobId),
        vopiService.getDownloadUrls(jobId),
      ]);

      setState({
        status: 'completed',
        job,
        downloadUrls,
      });
    } catch {
      setState({
        status: 'error',
        message: 'Failed to fetch results',
      });
    }
  };

  const cancel = useCallback(async () => {
    isCancelledRef.current = true;
    cleanup();

    if (currentJobIdRef.current) {
      try {
        await vopiService.cancelJob(currentJobIdRef.current);
      } catch {
        // Ignore cancellation errors
      }
    }

    setState({ status: 'cancelled' });
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    isCancelledRef.current = false;
    currentJobIdRef.current = null;
    setState({ status: 'idle' });
  }, [cleanup]);

  return {
    state,
    uploadAndProcess,
    cancel,
    reset,
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
