import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiError, api } from './api';

// ---------------------------------------------------------------------------
// Push Notification setup using expo-notifications
// ---------------------------------------------------------------------------

// Note: Notification handler is configured in App.tsx to avoid duplicate registration.

/**
 * Request push notification permissions and get the push token.
 * Registers the token with the server.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission not granted');
    return null;
  }

  // Android-specific: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250],
      lightColor: '#6366f1',
    });
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;

    // Get Expo push token (works for both iOS and Android via Expo's push service)
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    const token = tokenData.data;

    // Register token with our server
    await registerTokenWithServer(token, Platform.OS as 'ios' | 'android');

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

/**
 * Register the push token with the API server.
 */
async function registerTokenWithServer(
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  try {
    await api('/api/me/push-token', {
      method: 'POST',
      body: { token, platform },
    });
  } catch (error) {
    console.error('[Notifications] Failed to register push token:', error);
  }
}

/**
 * Remove push token from server (call on logout).
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api('/api/me/push-token', {
      method: 'DELETE',
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === 'UNAUTHORIZED')) {
      return;
    }
    console.error('[Notifications] Failed to unregister push token:', error);
  }
}

/**
 * Parse notification data to determine navigation target.
 * Returns navigation params for the app router.
 */
export function parseNotificationData(notification: Notifications.Notification): {
  screen: 'Channel' | 'Dm' | null;
  params: Record<string, string>;
} {
  const data = notification.request.content.data as Record<string, string> | undefined;

  if (!data) return { screen: null, params: {} };

  if (data.channelId && data.communityId) {
    return {
      screen: 'Channel',
      params: {
        communityId: data.communityId,
        channelId: data.channelId,
        channelName: data.channelName ?? 'channel',
      },
    };
  }

  if (data.dmUserId) {
    return {
      screen: 'Dm',
      params: {
        userId: data.dmUserId,
        displayName: data.displayName ?? 'User',
      },
    };
  }

  if (data.conversationId) {
    return {
      screen: 'Dm',
      params: {
        conversationId: data.conversationId,
        userId: data.userId ?? '',
        displayName: data.displayName ?? 'User',
      },
    };
  }

  return { screen: null, params: {} };
}

/**
 * Add a listener for notification taps (when user taps on a notification).
 * Returns a cleanup function.
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handler);
  return () => subscription.remove();
}

/**
 * Add a listener for notifications received while app is in foreground.
 * Returns a cleanup function.
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(handler);
  return () => subscription.remove();
}

/**
 * Get the notification that launched the app (if any).
 */
export async function getInitialNotification(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}
