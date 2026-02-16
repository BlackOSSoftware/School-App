import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@env';

let authToken = '';

function resolveBaseUrl(url) {
  if (!url || Platform.OS !== 'android') {
    return url;
  }

  return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(API_BASE_URL),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export function setAuthToken(token) {
  authToken = String(token ?? '');
}
