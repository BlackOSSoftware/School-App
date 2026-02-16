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
  const payload = {
    password: String(password ?? ''),
    fcmToken: String(fcmToken ?? 'student_device_token_1'),
  };

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
