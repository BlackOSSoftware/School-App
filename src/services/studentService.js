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

function normalizePhone(value) {
  return String(value ?? '')
    .replace(/[^\d]/g, '')
    .slice(0, 15);
}

function normalizeCreatePayload(payload) {
  return {
    name: String(payload?.name ?? payload?.firstName ?? '').trim(),
    scholarNumber: String(payload?.scholarNumber ?? '').trim(),
    parentName: String(payload?.parentName ?? '').trim(),
    number: normalizePhone(payload?.number),
    classId: normalizeEntityId(payload?.classId) || null,
    status: 'active',
  };
}

function normalizeUpdatePayload(payload) {
  const body = {};
  if (payload?.name !== undefined || payload?.firstName !== undefined) {
    body.name = String(payload?.name ?? payload?.firstName ?? '').trim();
  }
  if (payload?.scholarNumber !== undefined) {
    body.scholarNumber = String(payload.scholarNumber ?? '').trim();
  }
  if (payload?.parentName !== undefined) {
    body.parentName = String(payload.parentName ?? '').trim();
  }
  if (payload?.number !== undefined) {
    body.number = normalizePhone(payload.number);
  }
  if (payload?.classId !== undefined) {
    body.classId = normalizeEntityId(payload.classId) || null;
  }
  if (payload?.status !== undefined) {
    body.status = String(payload.status ?? '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  }
  if (payload?.password) {
    body.password = String(payload.password);
  }
  return body;
}

export async function createStudent(payload) {
  const body = normalizeCreatePayload(payload);
  const { data } = await apiClient.post('/student/create', body);
  return data;
}

export async function getAllStudents({ page = 1, limit = 10, search = '', classId = '', sessionId = '' }) {
  const normalizedSessionId = normalizeEntityId(sessionId);
  if (classId) {
    const normalizedClassId = normalizeEntityId(classId);
    const { data } = await apiClient.get(`/student/class/${normalizedClassId}`, {
      params: { page, limit, search, sessionId: normalizedSessionId || undefined },
    });
    return data;
  }
  const { data } = await apiClient.get('/student/all', {
    params: { page, limit, search, sessionId: normalizedSessionId || undefined },
  });
  return data;
}

export async function getStudentById(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }
  const { data } = await apiClient.get(`/student/${normalizedId}`);
  return data;
}

export async function updateStudent({ id, payload }) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }
  const body = normalizeUpdatePayload(payload);
  const attempts = [
    () => apiClient.patch(`/student/${normalizedId}`, body),
    () => apiClient.put(`/student/${normalizedId}`, body),
    () => apiClient.patch(`/student/update/${normalizedId}`, body),
    () => apiClient.put(`/student/update/${normalizedId}`, body),
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      const response = await attempt();
      return response.data;
    } catch (error) {
      lastError = error;
      const status = Number(error?.response?.status || 0);
      const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
      const isRouteIssue = status === 404 || message.includes('route not found');
      if (!isRouteIssue) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Unable to update student.');
}

export async function deleteStudent(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }
  const { data } = await apiClient.delete(`/student/${normalizedId}`);
  return data;
}

export async function transitionStudentsToSession(payload) {
  const sessionId = normalizeEntityId(payload?.sessionId);
  const sourceClassId = normalizeEntityId(payload?.sourceClassId);
  const updates = Array.isArray(payload?.updates)
    ? payload.updates
        .map(item => {
          const studentId = normalizeEntityId(item?.studentId);
          const action = String(item?.action ?? '').trim().toLowerCase();
          const normalizedAction = action === 'promote' || action === 'transfer' ? action : 'retain';
          const targetClassId = normalizeEntityId(item?.targetClassId);
          return {
            studentId,
            action: normalizedAction,
            targetClassId: targetClassId || undefined,
          };
        })
        .filter(item => item.studentId)
    : [];

  if (!sessionId) {
    throw new Error('Session is required.');
  }
  if (!sourceClassId) {
    throw new Error('Source class is required.');
  }
  if (!updates.length) {
    throw new Error('At least one student update is required.');
  }

  const body = {
    sessionId,
    sourceClassId,
    updates: updates.map(item => {
      if (item.action === 'transfer') {
        return {
          studentId: item.studentId,
          action: item.action,
        };
      }
      return {
        studentId: item.studentId,
        action: item.action,
        targetClassId: item.targetClassId || sourceClassId,
      };
    }),
  };

  const { data } = await apiClient.post('/student/session-transition', body);
  return data;
}
