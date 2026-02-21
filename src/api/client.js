import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL } from '@env';

let authToken = '';
let unauthorizedHandler = null;
let isUnauthorizedHandlingInProgress = false;

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
  // Let axios/RN set multipart boundaries automatically for FormData uploads.
  if (config?.data instanceof FormData && config?.headers) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  (error) => {
    const status = Number(error?.response?.status ?? 0);
    const shouldHandleUnauthorized =
      (status === 401 || status === 403) &&
      Boolean(authToken) &&
      typeof unauthorizedHandler === 'function';

    if (shouldHandleUnauthorized && !isUnauthorizedHandlingInProgress) {
      isUnauthorizedHandlingInProgress = true;
      Promise.resolve()
        .then(() => unauthorizedHandler?.(error))
        .finally(() => {
          isUnauthorizedHandlingInProgress = false;
        });
    }

    return Promise.reject(error);
  },
);

export function setAuthToken(token) {
  authToken = String(token ?? '');
}

export function getAuthToken() {
  return authToken;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}
