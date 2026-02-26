import RNFS from 'react-native-fs';
import { Linking, Platform } from 'react-native';
import { apiClient, getAuthToken } from '../api/client';

const downloadedFileCache = new Map();

function sanitizeFileName(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return `file-${Date.now()}`;
  }
  return raw.replace(/[<>:"/\\|?*]/g, '_');
}

function inferExtensionFromUrl(url = '') {
  const clean = String(url ?? '').split('?')[0].trim();
  const lastToken = clean.split('/').pop() || '';
  if (!lastToken.includes('.')) {
    return '';
  }
  const ext = lastToken.split('.').pop() || '';
  const normalized = ext.replace(/[^\w]/g, '').toLowerCase();
  return normalized ? `.${normalized}` : '';
}

export function resolveServerFileUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const base = String(apiClient?.defaults?.baseURL ?? '').replace(/\/api\/v1\/?$/, '');
  if (!base) {
    return value;
  }
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

export function resolveContentFileUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }
  const isApiPath =
    value.startsWith('/api/') ||
    value.startsWith('/student/me/content/download/') ||
    value.startsWith('/teacher/me/content/download/');
  return isApiPath ? resolveApiUrl(value) : resolveServerFileUrl(value);
}

function resolveApiUrl(path) {
  const value = String(path ?? '').trim();
  if (!value) {
    return '';
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const base = String(apiClient?.defaults?.baseURL ?? '').replace(/\/+$/, '');
  if (!base) {
    return value;
  }
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

function appendMode(url, mode) {
  const value = String(url ?? '').trim();
  if (!value) {
    return '';
  }
  const normalizedMode = String(mode ?? '').trim().toLowerCase();
  if (!normalizedMode) {
    return value;
  }
  return `${value}${value.includes('?') ? '&' : '?'}mode=${encodeURIComponent(normalizedMode)}`;
}

export async function downloadContentFile({ downloadUrl, contentId, url, fileName, category = 'General', mode = 'download' }) {
  const pathFromId = contentId ? `/student/me/content/download/${contentId}` : '';
  const preferredPath = String(downloadUrl ?? '').trim() || pathFromId || String(url ?? '').trim();
  const modeAwarePath = appendMode(preferredPath, mode);
  const isApiDownloadPath =
    modeAwarePath.startsWith('/api/') ||
    modeAwarePath.startsWith('/student/me/content/download/') ||
    modeAwarePath.startsWith('/teacher/me/content/download/');
  const absoluteUrl = isApiDownloadPath
    ? resolveApiUrl(modeAwarePath)
    : resolveContentFileUrl(modeAwarePath);
  if (!absoluteUrl) {
    throw new Error('File URL missing.');
  }

  const rootDirectory = Platform.OS === 'android'
    ? (RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath)
    : RNFS.DocumentDirectoryPath;
  const folder = `${rootDirectory}/SchoolApp/Documents/${sanitizeFileName(category)}`;
  await RNFS.mkdir(folder);

  const fallbackName = absoluteUrl.split('/').pop();
  let safeName = sanitizeFileName(fileName || fallbackName);
  if (!safeName.includes('.')) {
    const inferredExtension = inferExtensionFromUrl(absoluteUrl) || inferExtensionFromUrl(url) || '.pdf';
    safeName = `${safeName}${inferredExtension}`;
  }
  const targetPath = `${folder}/${Date.now()}-${safeName}`;
  const authToken = getAuthToken();
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const result = await RNFS.downloadFile({
    fromUrl: absoluteUrl,
    toFile: targetPath,
    headers,
    background: true,
    discretionary: true,
  }).promise;

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`Download failed with status ${result.statusCode}`);
  }

  return {
    path: targetPath,
    folder,
    fileName: safeName,
  };
}

function buildDownloadCacheKey({ downloadUrl, contentId, url }) {
  if (contentId) {
    return `id:${String(contentId).trim()}`;
  }
  if (downloadUrl) {
    return `download:${String(downloadUrl).trim()}`;
  }
  if (url) {
    return `url:${String(url).trim()}`;
  }
  return '';
}

async function openLocalFile(path) {
  const normalizedPath = String(path ?? '').trim();
  if (!normalizedPath) {
    throw new Error('Downloaded file path is missing.');
  }
  if (Platform.OS === 'android') {
    throw new Error('LOCAL_ANDROID_OPEN_UNSUPPORTED');
  }
  const encodedPath = encodeURI(normalizedPath);
  const fileUrl = encodedPath.startsWith('file://')
    ? encodedPath
    : `file://${encodedPath}`;
  await Linking.openURL(fileUrl);
}

async function openRemoteFile(params = {}) {
  const openPath = String(params.openUrl ?? '').trim()
    || String(params.downloadUrl ?? '').trim()
    || (params.contentId ? `/student/me/content/download/${params.contentId}` : '')
    || String(params.url ?? '').trim();
  if (!openPath) {
    throw new Error('Open URL missing.');
  }

  const modeAwarePath = appendMode(openPath, 'open');
  const isApiPath =
    modeAwarePath.startsWith('/api/') ||
    modeAwarePath.startsWith('/student/me/content/download/') ||
    modeAwarePath.startsWith('/teacher/me/content/download/');
  const absoluteUrl = isApiPath ? resolveApiUrl(modeAwarePath) : resolveContentFileUrl(modeAwarePath);
  if (!absoluteUrl) {
    throw new Error('Open URL missing.');
  }
  await Linking.openURL(absoluteUrl);
}

export async function openContentFile(params = {}) {
  const localPath = String(params.localPath ?? '').trim();
  const allowRemoteFallback = params.allowRemoteFallback !== false;
  if (localPath) {
    try {
      await openLocalFile(localPath);
      return { opened: 'local' };
    } catch (error) {
      const isAndroidLocalUnsupported = String(error?.message) === 'LOCAL_ANDROID_OPEN_UNSUPPORTED';
      if (!isAndroidLocalUnsupported) {
        throw error;
      }
      if (!allowRemoteFallback) {
        return { opened: 'downloaded-only' };
      }
    }
  }

  await openRemoteFile(params);
  return { opened: 'remote' };
}

export async function downloadAndOpenContentFile(params = {}) {
  const cacheKey = buildDownloadCacheKey(params);
  const cachedPath = cacheKey ? downloadedFileCache.get(cacheKey) : '';

  if (cachedPath && await RNFS.exists(cachedPath)) {
    await openContentFile({ ...params, localPath: cachedPath, allowRemoteFallback: false });
    return { path: cachedPath, fromCache: true };
  }

  const saved = await downloadContentFile(params);
  if (cacheKey && saved?.path) {
    downloadedFileCache.set(cacheKey, saved.path);
  }
  await openContentFile({ ...params, localPath: saved.path, allowRemoteFallback: false });
  return { path: saved.path, fromCache: false };
}
