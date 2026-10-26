import { apiClient, getAuthToken } from '../api/client';
import RNFS from 'react-native-fs';

function normalizeEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
  }
  return '';
}

function normalizeClassIds(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(item => normalizeEntityId(item)).filter(Boolean))];
  }
  const single = normalizeEntityId(value);
  return single ? [single] : [];
}

function normalizeFileUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
  const normalized = raw.replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx);
  return `/${normalized.replace(/^\/+/, '')}`;
}

function normalizeClassInfo(value) {
  if (!value) return null;
  const name = String(value?.name ?? '').trim();
  const section = String(value?.section ?? '').trim();
  return {
    id: normalizeEntityId(value),
    name,
    section,
    label: `${name}${section ? ` - ${section}` : ''}`.trim(),
  };
}

function normalizeTimetable(item) {
  const fileUrl = normalizeFileUrl(item?.file?.url ?? item?.file?.storagePath ?? '');
  return {
    id: normalizeEntityId(item),
    title: String(item?.title ?? '').trim(),
    description: String(item?.description ?? '').trim(),
    classInfo: normalizeClassInfo(item?.class ?? item?.classId),
    file: item?.file
      ? {
          name: String(item?.file?.name ?? item?.file?.originalName ?? '').trim(),
          mimeType: String(item?.file?.mimeType ?? '').trim(),
          size: Number(item?.file?.size ?? 0),
          url: fileUrl,
        }
      : null,
    createdAt: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
  };
}

function normalizeList(data = {}) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    success: Boolean(data?.success),
    message: String(data?.message ?? ''),
    data: rows.map(normalizeTimetable),
    page: Number(data?.page ?? 1),
    limit: Number(data?.limit ?? 20),
    total: Number(data?.total ?? rows.length),
    totalPages: Number(data?.totalPages ?? 1),
  };
}

function resolveApiUrl(path) {
  const value = String(path ?? '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const base = String(apiClient?.defaults?.baseURL ?? '').replace(/\/+$/, '');
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

function resolveUploadFilePath(uri) {
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('file://')) return decodeURIComponent(raw.replace(/^file:\/\//, ''));
  if (raw.startsWith('/')) return decodeURIComponent(raw);
  return '';
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(String(value ?? '').trim() || '{}');
  } catch {
    return null;
  }
}

function ensureFileUri(uri) {
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('file://') || raw.startsWith('content://') || raw.startsWith('http')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `file://${raw}`;
  }
  return raw;
}

async function prepareLocalUploadUri(file) {
  const originalUri = String(file?.uri ?? '').trim();
  if (!originalUri) return '';

  const localPath = resolveUploadFilePath(originalUri);
  if (localPath) {
    try {
      if (await RNFS.exists(localPath)) {
        return originalUri.startsWith('file://') ? originalUri : `file://${localPath}`;
      }
    } catch {
      // continue
    }
  }

  // content:// or missing file:// copy — materialize into app cache
  try {
    const safeName = String(file?.name || `timetable-${Date.now()}.bin`).replace(/[<>:"/\\|?*]/g, '_');
    const destPath = `${RNFS.CachesDirectoryPath}/${Date.now()}-${safeName}`;
    try {
      await RNFS.copyFile(
        originalUri.startsWith('file://') ? originalUri.replace(/^file:\/\//, '') : originalUri,
        destPath,
      );
    } catch {
      const base64 = await RNFS.readFile(originalUri, 'base64');
      await RNFS.writeFile(destPath, base64, 'base64');
    }
    if (await RNFS.exists(destPath)) {
      return `file://${destPath}`;
    }
  } catch {
    // fall through
  }

  return ensureFileUri(originalUri);
}

async function submitTimetable({
  endpoint,
  method = 'POST',
  classId,
  classIds,
  title,
  description,
  file,
  removeFile = false,
}) {
  const requestUrl = resolveApiUrl(endpoint);
  const authToken = getAuthToken();
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const normalizedClassIds = normalizeClassIds(classIds?.length ? classIds : classId);

  const fields = {
    title: String(title ?? '').trim(),
    description: String(description ?? '').trim(),
  };
  if (normalizedClassIds.length === 1) {
    fields.classId = normalizedClassIds[0];
  }
  if (normalizedClassIds.length > 0) {
    fields.classIds = JSON.stringify(normalizedClassIds);
  }
  if (removeFile) fields.removeFile = 'true';

  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));

  if (file?.uri) {
    const uploadUri = await prepareLocalUploadUri(file);
    formData.append('file', {
      uri: uploadUri || ensureFileUri(file.uri),
      name: String(file?.name || 'attachment').trim() || 'attachment',
      type: String(file?.type || 'application/octet-stream').trim() || 'application/octet-stream',
    });
  }

  const response = await fetch(requestUrl, { method, headers, body: formData });
  const rawText = await response.text();
  const data = parseJsonSafe(rawText);
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.response = { status: response.status, data };
    throw error;
  }

  const payload = data?.data;
  if (Array.isArray(payload)) {
    return { ...data, data: payload.map(normalizeTimetable) };
  }
  return { ...data, data: normalizeTimetable(payload) };
}

export async function getTeacherTimetables({ page = 1, limit = 20 } = {}) {
  const { data } = await apiClient.get('/timetable/teacher/me', { params: { page, limit } });
  return normalizeList(data);
}

export async function createTeacherTimetable(payload) {
  return submitTimetable({
    endpoint: '/timetable/teacher/me',
    method: 'POST',
    ...payload,
  });
}

export async function updateTeacherTimetable(timetableId, payload) {
  return submitTimetable({
    endpoint: `/timetable/teacher/${normalizeEntityId(timetableId)}`,
    method: 'PUT',
    ...payload,
  });
}

export async function deleteTeacherTimetable(timetableId) {
  const { data } = await apiClient.delete(`/timetable/teacher/${normalizeEntityId(timetableId)}`);
  return data;
}

export async function getAdminTimetables({ classId, page = 1, limit = 20 } = {}) {
  const { data } = await apiClient.get('/timetable/admin', {
    params: { classId: normalizeEntityId(classId), page, limit },
  });
  return normalizeList(data);
}

export async function createAdminTimetable(payload) {
  return submitTimetable({
    endpoint: '/timetable/admin',
    method: 'POST',
    ...payload,
  });
}

export async function updateAdminTimetable(timetableId, payload) {
  return submitTimetable({
    endpoint: `/timetable/admin/${normalizeEntityId(timetableId)}`,
    method: 'PUT',
    ...payload,
  });
}

export async function deleteAdminTimetable(timetableId) {
  const { data } = await apiClient.delete(`/timetable/admin/${normalizeEntityId(timetableId)}`);
  return data;
}

export async function getStudentTimetables({ page = 1, limit = 20 } = {}) {
  const { data } = await apiClient.get('/timetable/student/me', { params: { page, limit } });
  return normalizeList(data);
}
