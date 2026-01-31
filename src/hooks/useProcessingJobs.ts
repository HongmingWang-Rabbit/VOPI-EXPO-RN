import { useState, useEffect, useRef } from 'react';
import { vopiService } from '../services/vopi.service';

const POLL_INTERVAL = 10000; // 10 seconds
/** Fetch enough jobs to cover all potentially in-progress items */
const PROCESSING_JOBS_FETCH_LIMIT = 50;

const PROCESSING_STATUSES = [
  'pending',
  'downloading',
  'extracting',
  'scoring',
  'classifying',
  'extracting_product',
  'generating',
];

export function useProcessingJobs() {
  const [count, setCount] = useState(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchCount = async () => {
      try {
        const { jobs } = await vopiService.listJobs({ limit: PROCESSING_JOBS_FETCH_LIMIT });
        if (isMountedRef.current) {
          setCount(jobs.filter((j) => PROCESSING_STATUSES.includes(j.status)).length);
        }
      } catch {
        // ignore
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return count;
}
