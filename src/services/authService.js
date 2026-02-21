import { apiClient } from '../api/client';

function pickString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

export function buildLoginPayload({ identifier, password, fcmToken, loginType }) {
  const trimmedIdentifier = String(identifier ?? '').trim();
  const normalizedFcmToken = String(fcmToken ?? '').trim();
  const payload = {
    password: String(password ?? ''),
  };
  if (normalizedFcmToken) {
    payload.fcmToken = normalizedFcmToken;
  }

  const useEmail = loginType === 'email' || trimmedIdentifier.includes('@');

  if (useEmail) {
    payload.email = trimmedIdentifier.toLowerCase();
  } else {
    payload.scholarNumber = trimmedIdentifier;
  }

  return payload;
}

export function normalizeAuthResponse(rawResponse) {
  const body = rawResponse?.data ?? rawResponse ?? {};
  const nested = body?.data ?? {};

  const token = pickString(
    body?.token,
    body?.accessToken,
    body?.jwt,
    nested?.token,
    nested?.accessToken,
    nested?.jwt,
  );

  const role = pickString(
    body?.role,
    body?.user?.role,
    nested?.role,
    nested?.user?.role,
  ).toLowerCase();

  const user = body?.user ?? nested?.user ?? null;

  return {
    token,
    role,
    user,
    raw: body,
  };
}

export async function login(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return normalizeAuthResponse(data);
}

export async function updateMyFcmToken(fcmToken) {
  const token = String(fcmToken ?? '').trim();
  if (!token) {
    return null;
  }
  const { data } = await apiClient.put('/auth/fcm-token', { fcmToken: token });
  return data;
}

export async function changeAdminPassword({ oldPassword, newPassword }) {
  const payload = {
    oldPassword: String(oldPassword ?? ''),
    newPassword: String(newPassword ?? ''),
  };
  const { data } = await apiClient.post('/auth/admin/change-password', payload);
  return data;
}

export async function getStudentMe() {
  const { data } = await apiClient.get('/student/me');
  return data;
}

export async function changeStudentPassword({ oldPassword, newPassword }) {
  const payload = {
    oldPassword: String(oldPassword ?? ''),
    newPassword: String(newPassword ?? ''),
  };
  const { data } = await apiClient.put('/auth/student/change-password', payload);
  return data;
}
