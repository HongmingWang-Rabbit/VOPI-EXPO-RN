import { useState, useEffect, useRef } from 'react';
import { vopiService } from '../services/vopi.service';

const POLL_INTERVAL = 10000; // 10 seconds

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
        const { jobs } = await vopiService.listJobs({ limit: 50 });
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
