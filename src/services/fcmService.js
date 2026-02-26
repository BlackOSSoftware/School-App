import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';

function hasPermission(authStatus) {
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function getDeviceFcmToken() {
  try {
    const allowed = await requestNotificationPermissionPrompt();
    if (!allowed) {
      return '';
    }

    const token = await messaging().getToken();
    return String(token ?? '').trim();
  } catch (error) {
    console.warn('FCM token generation failed:', error?.message ?? error);
    return '';
  }
}

export async function requestNotificationPermissionPrompt() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    await messaging().registerDeviceForRemoteMessages();
    const status = await messaging().requestPermission();
    return hasPermission(status);
  } catch (error) {
    console.warn('Notification permission request failed:', error?.message ?? error);
    return false;
  }
}
