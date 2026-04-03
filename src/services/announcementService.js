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

function normalizeAnnouncementType(value, targetAudience) {
  const type = String(value ?? '').trim().toLowerCase();
  const audience = String(targetAudience ?? '').trim().toLowerCase();
  if (audience === 'teacher_only' || audience === 'teachers_only') {
    return 'teacher_only';
  }
  if (type === 'teacher_only' || type === 'teachers_only') {
    return 'teacher_only';
  }
  if (type === 'class_wise') {
    return 'class_wise';
  }
  return 'school_wide';
}

function normalizeAudience(value, announcementType) {
  const audience = String(value ?? '').trim().toLowerCase();
  const type = String(announcementType ?? '').trim().toLowerCase();
  if (audience === 'teacher_only' || audience === 'teachers_only' || type === 'teacher_only' || type === 'teachers_only') {
    return 'teacher_only';
  }
  return 'all';
}

export async function createAdminAnnouncement(payload) {
  const targetAudience = ['teacher_only', 'teachers_only']
    .includes(String(payload?.targetAudience ?? 'all').trim().toLowerCase())
    ? 'teacher_only'
    : 'all';
  const requestedType = String(payload?.announcementType ?? '').trim().toLowerCase();
  const normalizedType = targetAudience === 'teacher_only'
      ? 'teacher_only'
      : requestedType === 'class_wise'
      ? 'class_wise'
      : 'school_wide';
  const body = {
    title: String(payload?.title ?? '').trim(),
    description: String(payload?.description ?? '').trim(),
    announcementType: normalizedType,
    targetAudience,
  };

  if (normalizedType === 'class_wise' && targetAudience === 'all') {
    const classIds = Array.isArray(payload?.classIds)
      ? payload.classIds.map(normalizeEntityId).filter(Boolean)
      : [];
    const fallbackClassId = normalizeEntityId(payload?.classId);
    const normalizedClassIds = classIds.length
      ? classIds
      : (fallbackClassId ? [fallbackClassId] : []);
    if (!normalizedClassIds.length) {
      throw new Error('At least one class is required for class wise announcement.');
    }
    body.classIds = normalizedClassIds;
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

  const rows = Array.isArray(data?.data) ? data.data : [];
  const normalizedRows = rows.map(item => ({
    ...item,
    announcementType: normalizeAnnouncementType(item?.announcementType, item?.targetAudience),
    targetAudience: normalizeAudience(item?.targetAudience, item?.announcementType),
  }));

  return {
    success: Boolean(data?.success),
    data: normalizedRows,
    ...normalizePagination(data),
  };
}
