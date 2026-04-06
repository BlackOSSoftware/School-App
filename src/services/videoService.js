import { apiClient, getAuthToken } from '../api/client';
import RNFS from 'react-native-fs';

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

function resolveUploadPath(uri) {
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('file://')) {
    return decodeURIComponent(raw.slice('file://'.length));
  }
  if (raw.startsWith('/')) {
    return decodeURIComponent(raw);
  }
  return '';
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

async function uploadVideo({ endpoint, method = 'POST', payload = {}, videoFile }) {
  const title = String(payload?.title ?? '').trim();
  const description = String(payload?.description ?? '').trim();
  const requestUrl = resolveApiUrl(endpoint);
  const uploadPath = resolveUploadPath(videoFile?.uri);
  const fileUri = String(videoFile?.uri ?? '').trim();
  if (!fileUri) throw new Error('Invalid video file path.');

  const authToken = getAuthToken();
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  // Prefer native file-path upload when available.
  if (uploadPath) {
    const uploadResult = await RNFS.uploadFiles({
      toUrl: requestUrl,
      method,
      headers,
      fields: { title, description },
      files: [
        {
          name: 'video',
          filename: String(videoFile?.name || 'video.mp4'),
          filepath: uploadPath,
          filetype: String(videoFile?.type || 'video/mp4'),
        },
      ],
    }).promise;

    const data = parseJsonSafe(uploadResult?.body);
    if (uploadResult.statusCode >= 200 && uploadResult.statusCode < 300) {
      return {
        success: Boolean(data?.success),
        data: normalizeVideoItem(data?.data),
      };
    }

    throw new Error(String(data?.message || `Upload failed with status ${uploadResult.statusCode}`));
  }

  // Fallback for Android content:// URIs and providers where absolute file path is unavailable.
  const response = await fetch(requestUrl, {
    method,
    headers,
    body: buildVideoUploadFormData({ title, description, videoFile }),
  });
  const data = parseJsonSafe(await response.text());
  if (response.ok) {
    return {
      success: Boolean(data?.success),
      data: normalizeVideoItem(data?.data),
    };
  }

  throw new Error(String(data?.message || `Upload failed with status ${response.status}`));
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
