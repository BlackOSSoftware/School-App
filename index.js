/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background FCM message:', remoteMessage?.messageId ?? 'no-id');
});

AppRegistry.registerComponent(appName, () => App);
