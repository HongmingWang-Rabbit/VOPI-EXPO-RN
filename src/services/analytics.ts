/**
 * Analytics service for tracking user actions.
 * Uses a pluggable backend — swap the `send` implementation for
 * PostHog, Mixpanel, Amplitude, or a custom endpoint.
 */

type EventName =
  | 'screen_view'
  | 'video_selected'
  | 'video_recorded'
  | 'upload_started'
  | 'upload_completed'
  | 'upload_failed'
  | 'processing_started'
  | 'processing_completed'
  | 'processing_failed'
  | 'results_viewed'
  | 'metadata_edited'
  | 'push_to_platform'
  | 'push_succeeded'
  | 'push_failed'
  | 'credits_purchased'
  | 'platform_connected'
  | 'platform_disconnected'
  | 'sign_in'
  | 'sign_out'
  | 'onboarding_completed'
  | 'template_saved'
  | 'template_applied'
  | 'bulk_action';

type EventProperties = Record<string, string | number | boolean | undefined>;

let userId: string | null = null;
let analyticsEndpoint: string | null = null;

/**
 * Configure the analytics backend URL.
 * If not called, production events are silently queued in-memory.
 */
export function configureAnalytics(endpoint: string) {
  analyticsEndpoint = endpoint;
}

const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_COUNT = 3;

interface QueuedEvent {
  event: EventName;
  properties?: EventProperties;
  timestamp: number;
  retryCount?: number;
}

const eventQueue: QueuedEvent[] = [];

function send(event: EventName, properties?: EventProperties) {
  if (__DEV__) {
    console.log(`[Analytics] ${event}`, { userId, ...properties });
    return;
  }

  const payload: QueuedEvent = { event, properties: { ...(userId ? { userId } : {}), ...properties }, timestamp: Date.now() };

  if (!analyticsEndpoint) {
    // Buffer events until a backend is configured
    if (eventQueue.length < MAX_QUEUE_SIZE) {
      eventQueue.push(payload);
    }
    return;
  }

  fetch(analyticsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function flushQueue() {
  if (!analyticsEndpoint || eventQueue.length === 0) return;
  const events = eventQueue.splice(0, eventQueue.length);
  events.forEach((e) => {
    fetch(analyticsEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
    }).catch(() => {
      // Re-queue failed events with a retry limit to prevent infinite loops
      const retries = (e.retryCount ?? 0) + 1;
      if (retries <= MAX_RETRY_COUNT && eventQueue.length < MAX_QUEUE_SIZE) {
        eventQueue.push({ ...e, retryCount: retries });
      }
    });
  });
}

export const analytics = {
  identify(id: string) {
    userId = id;
  },

  reset() {
    userId = null;
  },

  track(event: EventName, properties?: EventProperties) {
    send(event, properties);
  },

  screen(screenName: string) {
    send('screen_view', { screen: screenName });
  },

  flush() {
    flushQueue();
  },
};
