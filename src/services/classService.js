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

export async function createClass(payload) {
  const sectionValue = String(payload?.section ?? '').trim();
  const body = {
    name: String(payload?.name ?? '').trim(),
    section: [sectionValue.toUpperCase()],
  };

  const { data } = await apiClient.post('/class/create', body);
  return data;
}

export async function getAllClasses({ page = 1, limit = 5 }) {
  const { data } = await apiClient.get('/class/all', {
    params: { page, limit },
  });
  return data;
}

export async function updateClass({ id, payload }) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid class id.');
  }

  const sectionValue = String(payload?.section ?? '').trim();
  const body = {
    name: String(payload?.name ?? '').trim(),
    section: [sectionValue.toUpperCase()],
  };

  const attempts = [
    () => apiClient.patch(`/class/${normalizedId}`, body),
    () => apiClient.put(`/class/${normalizedId}`, body),
    () => apiClient.patch(`/class/update/${normalizedId}`, body),
    () => apiClient.put(`/class/update/${normalizedId}`, body),
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

export async function deleteClass(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid class id.');
  }

  const attempts = [
    () => apiClient.delete(`/class/${normalizedId}`),
    () => apiClient.delete(`/class/delete/${normalizedId}`),
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
