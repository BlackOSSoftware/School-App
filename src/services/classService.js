import { apiClient } from '../api/client';

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
  const attempts = [
    () => apiClient.patch(`/class/${id}`, payload),
    () => apiClient.put(`/class/${id}`, payload),
    () => apiClient.patch(`/class/update/${id}`, payload),
    () => apiClient.put(`/class/update/${id}`, payload),
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
  const attempts = [
    () => apiClient.delete(`/class/${id}`),
    () => apiClient.delete(`/class/delete/${id}`),
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
