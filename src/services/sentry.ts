import * as Sentry from '@sentry/react-native';
import { env } from '../config/env';

export function initSentry() {
  if (!env.sentryDsn) {
    if (__DEV__) {
      console.log('[Sentry] No DSN configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    debug: __DEV__,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    attachScreenshot: true,
    enableAutoSessionTracking: true,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error('[Sentry] Captured error:', error, context);
    return;
  }

  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
  } else {
    Sentry.captureMessage(String(error), { extra: context, level: 'error' });
  }
}

export function setUser(user: { id: string; email?: string; name?: string } | null) {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email, username: user.name });
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
