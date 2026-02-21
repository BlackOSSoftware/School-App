import { apiClient } from '../api/client';

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

function normalizePagination(payload = {}) {
  return {
    total: Number(payload?.total ?? 0),
    page: Number(payload?.page ?? 1),
    limit: Number(payload?.limit ?? 10),
    totalPages: Number(payload?.totalPages ?? 1),
    hasNextPage: Boolean(payload?.hasNextPage),
    hasPrevPage: Boolean(payload?.hasPrevPage),
  };
}

export async function createAdminAnnouncement(payload) {
  const body = {
    title: String(payload?.title ?? '').trim(),
    description: String(payload?.description ?? '').trim(),
    announcementType:
      String(payload?.announcementType ?? '').trim().toLowerCase() === 'class_wise'
        ? 'class_wise'
        : 'school_wide',
  };

  if (body.announcementType === 'class_wise') {
    const classId = normalizeEntityId(payload?.classId);
    if (!classId) {
      throw new Error('Class is required for class wise announcement.');
    }
    body.classIds = [classId];
  }

  const { data } = await apiClient.post('/announcement/admin/create', body);
  return data;
}

export async function createTeacherAnnouncement(payload) {
  const classIds = Array.isArray(payload?.classIds)
    ? payload.classIds.map(normalizeEntityId).filter(Boolean)
    : [];

  if (!classIds.length) {
    throw new Error('At least one class is required.');
  }

  const body = {
    title: String(payload?.title ?? '').trim(),
    description: String(payload?.description ?? '').trim(),
    classIds,
  };

  const attempts = [
    () => apiClient.post('/announcement/teacher/create', body),
    () => apiClient.post('/announcement/create', body),
  ];

  let lastError;
  for (const run of attempts) {
    try {
      const { data } = await run();
      return data;
    } catch (error) {
      const status = error?.response?.status;
      if (status && status !== 404 && status !== 405) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}

export async function getMyAnnouncements({ page = 1, limit = 10 }) {
  const { data } = await apiClient.get('/announcement/me', {
    params: { page, limit },
  });

  return {
    success: Boolean(data?.success),
    data: Array.isArray(data?.data) ? data.data : [],
    ...normalizePagination(data),
  };
}
