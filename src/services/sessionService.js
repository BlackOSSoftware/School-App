import { apiClient } from '../api/client';

export async function createSession(payload) {
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
      // Keep retrying only for endpoint/method mismatch style failures.
      if (status && status !== 404 && status !== 405) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError;
}
