import { apiClient, getAuthToken } from '../api/client';
import RNFS from 'react-native-fs';

const CHUNK_SIZE_BYTES = 384 * 1024;

function normalizeEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') {
      return nested.$oid.trim();
    }
  }
  return '';
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(String(value ?? '').trim() || '{}');
  } catch {
    return null;
  }
}

function resolveApiUrl(path) {
  const value = String(path ?? '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value.replace(/\s+/g, '');
  const base = String(apiClient?.defaults?.baseURL ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\s+/g, '');
  if (!base) return value;
  return `${base}${value.startsWith('/') ? value : `/${value}`}`.replace(/\s+/g, '');
}

function buildVideoUploadFormData({ title, description, videoFile }) {
  const formData = new FormData();
  formData.append('title', String(title ?? '').trim());
  formData.append('description', String(description ?? '').trim());
  formData.append('video', {
    uri: String(videoFile?.uri ?? '').trim(),
    name: String(videoFile?.name || 'video.mp4'),
    type: String(videoFile?.type || 'video/mp4'),
  });
  return formData;
}

function hasHttpScheme(value = '') {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw.startsWith('http://') || raw.startsWith('https://');
}

function normalizeUploadUri(uri) {
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (
    raw.startsWith('file://') ||
    raw.startsWith('content://') ||
    raw.startsWith('ph://')
  ) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `file://${raw}`;
  }
  return raw;
}

function stripFileScheme(uri = '') {
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('file://')) return decodeURIComponent(raw.slice('file://'.length));
  return raw;
}

function guessVideoExtension({ name = '', uri = '' } = {}) {
  const fromName = String(name ?? '').trim();
  const fromUri = String(uri ?? '').trim();
  const source = fromName || fromUri;
  const normalized = source.split('?')[0].split('#')[0];
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0) return '.mp4';
  const ext = normalized.slice(dotIndex).toLowerCase();
  if (!ext || ext.length > 6) return '.mp4';
  return ext;
}

async function normalizeVideoFileForUpload(videoFile = {}) {
  const originalUri = String(videoFile?.uri ?? '').trim();
  if (!originalUri) {
    throw new Error('Invalid video file path.');
  }

  if (hasHttpScheme(originalUri)) {
    const extension = guessVideoExtension({ name: videoFile?.name, uri: originalUri });
    const tempPath = `${RNFS.CachesDirectoryPath}/video-upload-${Date.now()}${extension}`;
    const download = await RNFS.downloadFile({
      fromUrl: originalUri.replace(/\s+/g, ''),
      toFile: tempPath,
      discretionary: true,
      background: false,
    }).promise;
    if (Number(download?.statusCode) < 200 || Number(download?.statusCode) >= 300) {
      throw new Error(`Unable to read selected video file (${download?.statusCode || 'network error'}).`);
    }

    return {
      uri: `file://${tempPath}`,
      localPath: tempPath,
      cleanupPaths: [tempPath],
    };
  }

  const normalizedUri = normalizeUploadUri(originalUri);
  if (normalizedUri.startsWith('file://') || normalizedUri.startsWith('/')) {
    const localPath = stripFileScheme(normalizedUri);
    return {
      uri: normalizedUri.startsWith('file://') ? normalizedUri : `file://${localPath}`,
      localPath,
      cleanupPaths: [],
    };
  }

  const extension = guessVideoExtension({ name: videoFile?.name, uri: originalUri });
  const tempPath = `${RNFS.CachesDirectoryPath}/video-upload-copy-${Date.now()}${extension}`;
  try {
    await RNFS.copyFile(normalizedUri, tempPath);
  } catch {
    throw new Error('Unable to access selected video file. Please pick from local storage.');
  }

  return {
    uri: `file://${tempPath}`,
    localPath: tempPath,
    cleanupPaths: [tempPath],
  };
}

function normalizeVideoItem(item) {
  return {
    id: normalizeEntityId(item?.id ?? item?._id),
    title: String(item?.title ?? '').trim(),
    description: String(item?.description ?? '').trim(),
    createdAt: String(item?.createdAt ?? '').trim(),
    updatedAt: String(item?.updatedAt ?? '').trim(),
    uploadedByName: String(item?.uploadedBy?.name ?? '').trim(),
    file: {
      name: String(item?.file?.name ?? '').trim(),
      mimeType: String(item?.file?.mimeType ?? '').trim(),
      size: Number(item?.file?.size ?? 0),
      url: String(item?.file?.url ?? item?.file?.openUrl ?? '').trim(),
      openUrl: String(item?.file?.openUrl ?? item?.file?.url ?? '').trim(),
    },
  };
}

function normalizeListResponse(data = {}) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    success: Boolean(data?.success),
    data: rows.map(normalizeVideoItem),
    total: Number(data?.total ?? rows.length),
    page: Number(data?.page ?? 1),
    limit: Number(data?.limit ?? 10),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

function isPayloadTooLargeStatus(statusCode) {
  return Number(statusCode) === 413;
}

async function uploadVideoInChunks({ title, description, videoFile, localPath, totalSize }) {
  const initResponse = await apiClient.post('/video/admin/create/chunk/init', {
    title,
    description,
    fileName: String(videoFile?.name || 'video.mp4'),
    mimeType: String(videoFile?.type || 'video/mp4'),
    totalSize: Number(totalSize || 0),
  });

  const uploadId = String(initResponse?.data?.data?.uploadId || '').trim();
  const chunkSize = Number(initResponse?.data?.data?.chunkSizeBytes || CHUNK_SIZE_BYTES);
  if (!uploadId) {
    throw new Error('Chunk upload session failed to initialize.');
  }

  let offset = 0;
  let index = 0;
  const fileSize = Number(totalSize || 0);
  while (offset < fileSize) {
    const length = Math.min(chunkSize, fileSize - offset);
    const chunkBase64 = await RNFS.read(localPath, length, offset, 'base64');
    await apiClient.post(`/video/admin/create/chunk/${uploadId}`, {
      index,
      chunkBase64,
    });
    offset += length;
    index += 1;
  }

  const completeResponse = await apiClient.post(`/video/admin/create/chunk/${uploadId}/complete`);
  return {
    success: Boolean(completeResponse?.data?.success),
    data: normalizeVideoItem(completeResponse?.data?.data),
  };
}

async function uploadVideo({ endpoint, method = 'POST', payload = {}, videoFile }) {
  const title = String(payload?.title ?? '').trim();
  const description = String(payload?.description ?? '').trim();
  const requestUrl = resolveApiUrl(endpoint);
  const fileUri = String(videoFile?.uri ?? '').trim();
  if (!fileUri) throw new Error('Invalid video file path.');

  const authToken = getAuthToken();
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const normalizedFile = await normalizeVideoFileForUpload(videoFile);
  const stat = await RNFS.stat(normalizedFile.localPath);
  const totalSize = Number(stat?.size || videoFile?.size || 0);
  if (!totalSize) {
    throw new Error('Selected video is empty.');
  }

  try {
    const response = await fetch(requestUrl, {
      method,
      headers,
      body: buildVideoUploadFormData({
        title,
        description,
        videoFile: {
          ...videoFile,
          uri: normalizedFile.uri,
        },
      }),
    });
    const data = parseJsonSafe(await response.text());
    if (response.ok) {
      return {
        success: Boolean(data?.success),
        data: normalizeVideoItem(data?.data),
      };
    }

    if (
      method === 'POST' &&
      endpoint === '/video/admin/create' &&
      isPayloadTooLargeStatus(response.status)
    ) {
      return uploadVideoInChunks({
        title,
        description,
        videoFile,
        localPath: normalizedFile.localPath,
        totalSize,
      });
    }

    throw new Error(String(data?.message || `Upload failed with status ${response.status}`));
  } finally {
    if (Array.isArray(normalizedFile.cleanupPaths)) {
      for (const target of normalizedFile.cleanupPaths) {
        try {
          await RNFS.unlink(target);
        } catch {
          // Best effort cache cleanup.
        }
      }
    }
  }
}

export async function getAdminVideos({ page = 1, limit = 10, search = '' } = {}) {
  const { data } = await apiClient.get('/video/admin/all', { params: { page, limit, search } });
  return normalizeListResponse(data);
}

export async function createAdminVideo({ title, description, file }) {
  return uploadVideo({
    endpoint: '/video/admin/create',
    method: 'POST',
    payload: { title, description },
    videoFile: file,
  });
}

export async function updateAdminVideo({ id, title, description, file }) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) throw new Error('Invalid video id.');

  if (file?.uri) {
    return uploadVideo({
      endpoint: `/video/admin/${normalizedId}`,
      method: 'PUT',
      payload: { title, description },
      videoFile: file,
    });
  }

  const { data } = await apiClient.put(`/video/admin/${normalizedId}`, {
    title: String(title ?? '').trim(),
    description: String(description ?? '').trim(),
  });
  return {
    success: Boolean(data?.success),
    data: normalizeVideoItem(data?.data),
  };
}

export async function deleteAdminVideo(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) throw new Error('Invalid video id.');
  const { data } = await apiClient.delete(`/video/admin/${normalizedId}`);
  return data;
}

export async function getTeacherVideos({ page = 1, limit = 20, search = '' } = {}) {
  const { data } = await apiClient.get('/video/teacher/all', { params: { page, limit, search } });
  return normalizeListResponse(data);
}

export async function getStudentVideos({ page = 1, limit = 20, search = '' } = {}) {
  const { data } = await apiClient.get('/video/student/all', { params: { page, limit, search } });
  return normalizeListResponse(data);
}
