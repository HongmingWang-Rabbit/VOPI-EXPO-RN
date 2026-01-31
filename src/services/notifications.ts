import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let handlerConfigured = false;

/** Configure how notifications are handled when app is in foreground. Safe to call multiple times. */
export function configureNotificationHandler() {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configureNotificationHandler();

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, string>) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null, // immediate
    });
  } catch {
    if (__DEV__) {
      console.warn('[Notifications] Failed to send local notification');
    }
  }
}

export async function notifyProcessingComplete(jobId: string, productTitle?: string) {
  const title = 'Processing Complete';
  const body = productTitle
    ? `"${productTitle}" is ready for review.`
    : 'Your product is ready for review.';
  await sendLocalNotification(title, body, { jobId, type: 'processing_complete' });
}

export async function notifyProcessingFailed(jobId: string) {
  await sendLocalNotification(
    'Processing Failed',
    'There was an issue processing your video. Tap to retry.',
    { jobId, type: 'processing_failed' }
  );
}
