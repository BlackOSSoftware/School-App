/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Background FCM message:', remoteMessage?.messageId ?? 'no-id');
  });
} catch (error) {
  console.warn('FCM background handler unavailable in this runtime:', error?.message ?? error);
}

AppRegistry.registerComponent(appName, () => App);
