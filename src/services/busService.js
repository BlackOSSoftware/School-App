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

function normalizeCapacity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return undefined;
  }
  return Math.floor(numeric);
}

function normalizeCreatePayload(payload) {
  return {
    busNumber: String(payload?.busNumber ?? '').trim(),
    routeName: String(payload?.routeName ?? '').trim(),
    driverName: String(payload?.driverName ?? '').trim(),
    driverPhone: normalizePhone(payload?.driverPhone),
    helperName: String(payload?.helperName ?? '').trim(),
    helperPhone: normalizePhone(payload?.helperPhone),
    trackingUsername: String(payload?.trackingUsername ?? '').trim(),
    trackingPassword: String(payload?.trackingPassword ?? '').trim(),
    capacity: normalizeCapacity(payload?.capacity),
    status: String(payload?.status ?? 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active',
  };
}

function normalizeUpdatePayload(payload) {
  const body = {};
  if (payload?.busNumber !== undefined) {
    body.busNumber = String(payload.busNumber ?? '').trim();
  }
  if (payload?.routeName !== undefined) {
    body.routeName = String(payload.routeName ?? '').trim();
  }
  if (payload?.driverName !== undefined) {
    body.driverName = String(payload.driverName ?? '').trim();
  }
  if (payload?.driverPhone !== undefined) {
    body.driverPhone = normalizePhone(payload.driverPhone);
  }
  if (payload?.helperName !== undefined) {
    body.helperName = String(payload.helperName ?? '').trim();
  }
  if (payload?.helperPhone !== undefined) {
    body.helperPhone = normalizePhone(payload.helperPhone);
  }
  if (payload?.trackingUsername !== undefined) {
    body.trackingUsername = String(payload.trackingUsername ?? '').trim();
  }
  if (payload?.trackingPassword !== undefined) {
    body.trackingPassword = String(payload.trackingPassword ?? '').trim();
  }
  if (payload?.capacity !== undefined) {
    body.capacity = normalizeCapacity(payload.capacity);
  }
  if (payload?.status !== undefined) {
    body.status = String(payload.status ?? '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
  }
  return body;
}

export async function createBus(payload) {
  const body = normalizeCreatePayload(payload);
  const { data } = await apiClient.post('/bus/create', body);
  return data;
}

export async function getAllBuses({ page = 1, limit = 10, search = '' }) {
  const { data } = await apiClient.get('/bus/all', {
    params: { page, limit, search },
  });
  return data;
}

export async function getBusById(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid bus id.');
  }

  const attempts = [
    () => apiClient.get(`/bus/${normalizedId}`),
    () => apiClient.get(`/bus/detail/${normalizedId}`),
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

export async function updateBus({ id, payload }) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid bus id.');
  }

  const body = normalizeUpdatePayload(payload);
  const attempts = [
    () => apiClient.patch(`/bus/${normalizedId}`, body),
    () => apiClient.put(`/bus/${normalizedId}`, body),
    () => apiClient.patch(`/bus/update/${normalizedId}`, body),
    () => apiClient.put(`/bus/update/${normalizedId}`, body),
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

export async function deleteBus(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid bus id.');
  }

  const attempts = [
    () => apiClient.delete(`/bus/${normalizedId}`),
    () => apiClient.delete(`/bus/delete/${normalizedId}`),
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
