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
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    await messaging().registerDeviceForRemoteMessages();

    if (Platform.OS === 'ios') {
      const status = await messaging().requestPermission();
      if (!hasPermission(status)) {
        return '';
      }
    } else if (Platform.OS === 'android') {
      await messaging().requestPermission();
    }

    const token = await messaging().getToken();
    return String(token ?? '').trim();
  } catch (error) {
    console.warn('FCM token generation failed:', error?.message ?? error);
    return '';
  }
}
