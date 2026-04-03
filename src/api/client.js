import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import { API_BASE_URL } from '@env';

const CLOUD_API_FALLBACK = 'https://school.blackossoftwaresolution.in/api/v1/';
const DEV_DEFAULT_ANDROID_LOCAL_API = 'http://10.0.2.2:4000/api/v1/';
const DEV_DEFAULT_IOS_LOCAL_API = 'http://127.0.0.1:4000/api/v1/';

let authToken = '';
let unauthorizedHandler = null;
let isUnauthorizedHandlingInProgress = false;
let baseUrlIndex = 0;

function normalizeBaseUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }
  return value.endsWith('/') ? value : `${value}/`;
}

function joinUrl(baseUrl, path = '') {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = String(path ?? '').replace(/^\/+/, '');
  return `${normalizedBase}${normalizedPath}`;
}

function getDevServerHostCandidates() {
  const scriptUrl =
    NativeModules?.SourceCode?.scriptURL ||
    NativeModules?.SourceCode?.getConstants?.()?.scriptURL ||
    '';

  if (!scriptUrl) {
    return [];
  }

  try {
    const parsed = new URL(String(scriptUrl));
    const host = String(parsed.hostname ?? '').trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return [];
    }
    return [host];
  } catch {
    return [];
  }
}

function buildBaseUrlCandidates(url) {
  const isDevRuntime = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
  const includeCloudFallback = !isDevRuntime;
  const normalizedUrl = normalizeBaseUrl(url);

  if (!normalizedUrl && isDevRuntime) {
    if (Platform.OS === 'android') {
      return [DEV_DEFAULT_ANDROID_LOCAL_API, 'http://localhost:4000/api/v1/'];
    }
    return [DEV_DEFAULT_IOS_LOCAL_API, 'http://localhost:4000/api/v1/'];
  }

  if (!normalizedUrl) {
    return includeCloudFallback ? [CLOUD_API_FALLBACK] : [];
  }

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return includeCloudFallback ? [normalizedUrl, CLOUD_API_FALLBACK] : [normalizedUrl];
  }

  try {
    const parsed = new URL(normalizedUrl);
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return includeCloudFallback
        ? [...new Set([normalizedUrl, CLOUD_API_FALLBACK])]
        : [normalizedUrl];
    }

    const hosts =
      Platform.OS === 'android'
        ? [
            ...getDevServerHostCandidates(),
            '10.0.2.2',
            '10.0.3.2',
            '127.0.0.1',
            'localhost',
          ]
        : [
            ...getDevServerHostCandidates(),
            '127.0.0.1',
            'localhost',
          ];
    const candidates = hosts.map(host => {
      const clone = new URL(normalizedUrl);
      clone.hostname = host;
      return clone.toString();
    });

    return includeCloudFallback ? [...new Set([...candidates, CLOUD_API_FALLBACK])] : [...new Set(candidates)];
  } catch {
    return includeCloudFallback
      ? [...new Set([normalizedUrl, CLOUD_API_FALLBACK])]
      : [normalizedUrl];
  }
}

const apiBaseUrlCandidates = buildBaseUrlCandidates(API_BASE_URL);
const shouldLogNetworkDebug = false;

export const apiClient = axios.create({
  baseURL: apiBaseUrlCandidates[baseUrlIndex],
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = apiBaseUrlCandidates[baseUrlIndex];
  }

  apiClient.defaults.baseURL = config.baseURL;

  // Let axios/RN set multipart boundaries automatically for FormData uploads.
  if (config?.data instanceof FormData && config?.headers) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (shouldLogNetworkDebug) {
    const method = String(config?.method ?? 'GET').toUpperCase();
    const finalUrl = joinUrl(config.baseURL, config.url);
    console.log('[API Request]', {
      method,
      baseURL: config.baseURL,
      url: config.url,
      finalUrl,
      data: config?.data,
    });
  }

  return config;
});

apiClient.interceptors.response.use(
  response => {
    if (shouldLogNetworkDebug) {
      console.log('[API Response]', {
        status: response?.status,
        finalUrl: joinUrl(response?.config?.baseURL, response?.config?.url),
        data: response?.data,
      });
    }

    return response;
  },
  (error) => {
    const currentConfig = error?.config;
    const status = Number(error?.response?.status ?? 0);
    const shouldHandleUnauthorized =
      (status === 401 || status === 403) &&
      Boolean(authToken) &&
      typeof unauthorizedHandler === 'function';

    const nextBaseUrlIndex = Number(currentConfig?.__retryBaseUrlIndex ?? baseUrlIndex) + 1;
    const canRetryWithNextBaseUrl =
      currentConfig &&
      apiBaseUrlCandidates.length > 1 &&
      nextBaseUrlIndex < apiBaseUrlCandidates.length &&
      (!error?.response || status === 404);

    if (canRetryWithNextBaseUrl) {
      baseUrlIndex = nextBaseUrlIndex;
      currentConfig.__retryBaseUrlIndex = nextBaseUrlIndex;
      currentConfig.baseURL = apiBaseUrlCandidates[nextBaseUrlIndex];
      apiClient.defaults.baseURL = currentConfig.baseURL;

      if (shouldLogNetworkDebug) {
        console.warn('[API Retry]', {
          reason: !error?.response ? 'network-error' : `status-${status}`,
          nextBaseURL: currentConfig.baseURL,
          finalUrl: joinUrl(currentConfig.baseURL, currentConfig.url),
        });
      }

      return apiClient.request(currentConfig);
    }

    if (shouldLogNetworkDebug) {
      console.warn('[API Error]', {
        message: error?.message,
        code: error?.code,
        status,
        baseURL: currentConfig?.baseURL,
        url: currentConfig?.url,
        finalUrl: joinUrl(currentConfig?.baseURL, currentConfig?.url),
        responseData: error?.response?.data,
        fullError: error?.toJSON ? error.toJSON() : String(error),
      });
    }

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

export function getApiBaseUrl() {
  return apiBaseUrlCandidates[baseUrlIndex] ?? '';
}

export function getApiBaseUrlCandidates() {
  return [...apiBaseUrlCandidates];
}

export function buildApiUrl(path = '') {
  return joinUrl(getApiBaseUrl(), path);
}
