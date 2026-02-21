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
    firstName: String(payload?.firstName ?? '').trim(),
    scholarNumber: String(payload?.scholarNumber ?? '').trim(),
    parentName: String(payload?.parentName ?? '').trim(),
    number: normalizePhone(payload?.number),
    classId: normalizeEntityId(payload?.classId) || null,
    status: 'active',
  };
}

function normalizeUpdatePayload(payload) {
  const body = {};
  if (payload?.firstName !== undefined) {
    body.firstName = String(payload.firstName ?? '').trim();
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

export async function getAllStudents({ page = 1, limit = 10, search = '', classId = '' }) {
  if (classId) {
    const normalizedClassId = normalizeEntityId(classId);
    const { data } = await apiClient.get(`/student/class/${normalizedClassId}`, {
      params: { page, limit, search },
    });
    return data;
  }
  const { data } = await apiClient.get('/student/all', {
    params: { page, limit, search },
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
  const { data } = await apiClient.patch(`/student/${normalizedId}`, body);
  return data;
}

export async function deleteStudent(id) {
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }
  const { data } = await apiClient.delete(`/student/${normalizedId}`);
  return data;
}

