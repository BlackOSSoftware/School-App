import { apiClient } from '../api/client';

function normalizeEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') return nested.$oid.trim();
  }
  return '';
}

async function executeUpdateSession(id, payload) {
  const attempts = [
    () => apiClient.patch(`/session/${id}`, payload),
    () => apiClient.put(`/session/${id}`, payload),
    () => apiClient.patch(`/session/update/${id}`, payload),
    () => apiClient.put(`/session/update/${id}`, payload),
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

async function deactivateCurrentActiveSession(excludeId = '') {
  try {
    const activeResponse = await getActiveSession();
    const activeData = activeResponse?.data ?? activeResponse ?? null;
    const activeId = normalizeEntityId(activeData);
    if (!activeId || (excludeId && activeId === excludeId)) {
      return;
    }
    await executeUpdateSession(activeId, { isActive: false });
  } catch (error) {
    const status = Number(error?.response?.status || 0);
    if (status && status !== 404) {
      throw error;
    }
  }
}

export async function createSession(payload) {
  if (payload?.isActive) {
    await deactivateCurrentActiveSession();
  }
  const { data } = await apiClient.post('/session/create', payload);
  return data;
}

export async function getAllSessions({ page = 1, limit = 5 }) {
  const { data } = await apiClient.get('/session/all', {
    params: { page, limit },
  });
  return data;
}

export async function getActiveSession() {
  const { data } = await apiClient.get('/session/active');
  return data;
}

export async function updateSession({ id, payload }) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid session id.');
  }

  if (payload?.isActive) {
    await deactivateCurrentActiveSession(normalizedId);
  }

  return executeUpdateSession(normalizedId, payload);
}
