import { apiClient, getAuthToken } from '../api/client';
import RNFS from 'react-native-fs';

function normalizeEntityId(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') {
      return nested.trim();
    }
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') {
      return nested.$oid.trim();
    }
  }
  return '';
}

function normalizeClassInfo(value) {
  return {
    id: normalizeEntityId(value?._id ?? value?.id ?? value),
    name: String(value?.name ?? '').trim(),
    section: String(value?.section ?? '').trim(),
  };
}

function normalizeFileUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return raw;
  }

  const normalized = raw.replace(/\\/g, '/');
  const uploadMarker = '/uploads/';
  const markerIndex = normalized.lastIndexOf(uploadMarker);
  if (markerIndex >= 0) {
    return normalized.slice(markerIndex);
  }
  return `/${normalized.replace(/^\/+/, '')}`;
}

function normalizeContentItem(item, { viewerRole = 'student' } = {}) {
  const contentId = normalizeEntityId(item?._id ?? item?.id);
  const fileUrl = normalizeFileUrl(item?.file?.url ?? item?.file?.storagePath ?? '');
  const openUrl = normalizeFileUrl(item?.file?.openUrl ?? item?.file?.url ?? item?.file?.storagePath ?? '');
  const defaultDownloadPath = contentId
    ? `/${viewerRole === 'teacher' ? 'teacher' : 'student'}/me/content/download/${contentId}`
    : '';
  const downloadUrl = normalizeFileUrl(item?.file?.downloadUrl ?? defaultDownloadPath);

  return {
    id: contentId,
    type: String(item?.type ?? '').trim().toLowerCase(),
    title: String(item?.title ?? '').trim(),
    description: String(item?.description ?? '').trim(),
    subject: String(item?.subject ?? '').trim().toUpperCase(),
    classInfo: normalizeClassInfo(item?.classId ?? item?.class),
    file: item?.file
      ? {
          url: fileUrl,
          openUrl,
          downloadUrl,
          name: String(item?.file?.name ?? item?.file?.originalName ?? '').trim(),
          mimeType: String(item?.file?.mimeType ?? item?.file?.mimetype ?? '').trim(),
          size: Number(item?.file?.size ?? 0),
        }
      : null,
    createdAt: String(item?.createdAt ?? '').trim(),
  };
}

function normalizePaginatedResponse(data = {}, options = {}) {
  const payload = data?.data ?? {};
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return {
    success: Boolean(data?.success),
    message: String(data?.message ?? ''),
    data: rows.map(item => normalizeContentItem(item, options)),
    page: Number(payload?.page ?? data?.page ?? 1),
    limit: Number(payload?.limit ?? data?.limit ?? 10),
    total: Number(payload?.total ?? data?.total ?? rows.length),
    totalPages: Number(payload?.totalPages ?? data?.totalPages ?? 1),
    hasNextPage: Boolean(payload?.hasNextPage ?? data?.hasNextPage),
    hasPrevPage: Boolean(payload?.hasPrevPage ?? data?.hasPrevPage),
  };
}

function buildListParams({ page = 1, limit = 10, classId = '', subject = '' } = {}) {
  const params = { page, limit };
  const normalizedClassId = normalizeEntityId(classId);
  const normalizedSubject = String(subject ?? '').trim().toUpperCase();

  if (normalizedClassId) {
    params.classId = normalizedClassId;
  }
  if (normalizedSubject && normalizedSubject !== 'ALL') {
    params.subject = normalizedSubject;
  }
  return params;
}

function buildCreatePayload({ classId, subject, title, description, file, fileFieldName = 'file' }) {
  const formData = new FormData();
  formData.append('classId', normalizeEntityId(classId));
  if (subject) {
    formData.append('subject', String(subject).trim().toUpperCase());
  }
  formData.append('title', String(title ?? '').trim());
  formData.append('description', String(description ?? '').trim());

  if (file?.uri) {
    const normalizedName = String(file.name || 'attachment').trim() || 'attachment';
    const normalizedType = String(file.type || 'application/octet-stream').trim() || 'application/octet-stream';
    formData.append(fileFieldName, {
      uri: file.uri,
      name: normalizedName,
      type: normalizedType,
    });
  }

  return formData;
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

function parseJsonSafe(value) {
  try {
    return JSON.parse(String(value ?? '').trim() || '{}');
  } catch {
    return null;
  }
}

function extractErrorMessage(data, fallback) {
  return String(data?.message || data?.error || fallback).trim();
}

function inferFileFieldNameFromMessage(message = '') {
  const text = String(message ?? '').toLowerCase();
  if (!text) {
    return '';
  }
  if (text.includes('document')) return 'document';
  if (text.includes('attachment')) return 'attachment';
  if (text.includes('upload')) return 'upload';
  if (text.includes('file') || text.includes('unexpected field')) return 'file';
  return '';
}

function resolveUploadFilePath(uri) {
  const raw = String(uri ?? '').trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('file://')) {
    return decodeURIComponent(raw.slice('file://'.length));
  }
  if (raw.startsWith('/')) {
    return decodeURIComponent(raw);
  }
  return '';
}

export async function createTeacherContentByType({ type, classId, subject, title, description, file }) {
  const normalizedType = String(type ?? '').trim().toLowerCase();
  if (normalizedType !== 'homework' && normalizedType !== 'notes') {
    throw new Error('Invalid content type.');
  }

  const endpoint = `/teacher/me/content/${normalizedType}`;
  const requestUrl = resolveApiUrl(endpoint);
  const normalizedClassId = normalizeEntityId(classId);
  const normalizedTitle = String(title ?? '').trim();
  const normalizedDescription = String(description ?? '').trim();
  const normalizedSubject = String(subject ?? '').trim().toUpperCase();
  const authToken = getAuthToken();
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const fileFieldCandidates = ['file', 'document', 'attachment', 'upload'];
  const canRetryWithAlternateField = Boolean(file?.uri);
  const triedFields = new Set();

  const tryUploadWithField = async (fieldName) => {
    triedFields.add(fieldName);
    const body = buildCreatePayload({
      classId: normalizedClassId,
      subject: normalizedSubject,
      title: normalizedTitle,
      description: normalizedDescription,
      file,
      fileFieldName: fieldName,
    });

    const uploadPath = resolveUploadFilePath(file?.uri);
    if (uploadPath) {
      const fields = {
        classId: normalizedClassId,
        title: normalizedTitle,
        description: normalizedDescription,
      };
      if (normalizedSubject) {
        fields.subject = normalizedSubject;
      }

      const uploadResult = await RNFS.uploadFiles({
        toUrl: requestUrl,
        method: 'POST',
        headers,
        fields,
        files: [
          {
            name: fieldName,
            filename: String(file?.name || 'attachment').trim() || 'attachment',
            filepath: uploadPath,
            filetype: String(file?.type || 'application/octet-stream').trim() || 'application/octet-stream',
          },
        ],
      }).promise;

      const data = parseJsonSafe(uploadResult?.body);
      if (uploadResult.statusCode >= 200 && uploadResult.statusCode < 300) {
        return {
          success: Boolean(data?.success),
          data: normalizeContentItem(data?.data, { viewerRole: 'teacher' }),
        };
      }

      const message = extractErrorMessage(data, `Upload failed with status ${uploadResult.statusCode}`);
      const error = new Error(message);
      error.response = { status: uploadResult.statusCode, data };
      throw error;
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body,
    });

    const data = parseJsonSafe(await response.text());
    if (!response.ok) {
      const message = extractErrorMessage(data, `Upload failed with status ${response.status}`);
      const error = new Error(message);
      error.response = { status: response.status, data };
      throw error;
    }

    return {
      success: Boolean(data?.success),
      data: normalizeContentItem(data?.data, { viewerRole: 'teacher' }),
    };
  };

  try {
    return await tryUploadWithField('file');
  } catch (error) {
    if (!canRetryWithAlternateField) {
      throw error;
    }

    const hintedField = inferFileFieldNameFromMessage(error?.message || error?.response?.data?.message);
    const retryOrder = hintedField
      ? [hintedField, ...fileFieldCandidates.filter(item => item !== hintedField)]
      : fileFieldCandidates;

    for (const fieldName of retryOrder) {
      if (triedFields.has(fieldName)) {
        continue;
      }
      try {
        return await tryUploadWithField(fieldName);
      } catch (retryError) {
        error.response = retryError?.response || error.response;
        error.message = retryError?.message || error.message;
      }
    }

    throw error;
  }
}

export async function getTeacherMyContent({ type = 'all', page = 1, limit = 10, classId = '', subject = '' } = {}) {
  const normalizedType = String(type ?? 'all').trim().toLowerCase();
  const endpoint = normalizedType === 'homework' || normalizedType === 'notes'
    ? `/teacher/me/content/${normalizedType}`
    : '/teacher/me/content';

  const { data } = await apiClient.get(endpoint, {
    params: normalizedType === 'all'
      ? { ...buildListParams({ page, limit, classId, subject }), type: 'all' }
      : buildListParams({ page, limit, classId, subject }),
  });

  return normalizePaginatedResponse(data, { viewerRole: 'teacher' });
}

export async function getStudentMyContent({ type = 'all', page = 1, limit = 10, subject = '' } = {}) {
  const normalizedType = String(type ?? 'all').trim().toLowerCase();
  const endpoint = normalizedType === 'homework' || normalizedType === 'notes'
    ? `/student/me/content/${normalizedType}`
    : '/student/me/content';

  const params = { page, limit };
  const normalizedSubject = String(subject ?? '').trim().toUpperCase();
  if (normalizedSubject && normalizedSubject !== 'ALL') {
    params.subject = normalizedSubject;
  }
  if (normalizedType === 'all') {
    params.type = 'all';
  }

  const { data } = await apiClient.get(endpoint, { params });
  return normalizePaginatedResponse(data, { viewerRole: 'student' });
}
