import { apiClient } from '../api/client';

function normalizeSubjects(subjects) {
  if (!Array.isArray(subjects)) {
    return [];
  }
  return subjects
    .map(item => String(item ?? '').trim().toUpperCase())
    .filter(Boolean);
}

function normalizeLectureAssignments(lectureAssignments) {
  if (!Array.isArray(lectureAssignments)) {
    return [];
  }

  return lectureAssignments
    .map(item => ({
      classId: item?.classId ? String(item.classId) : null,
      subject: String(item?.subject ?? '').trim().toUpperCase(),
    }))
    .filter(item => item.subject);
}

function normalizeTeacherPayload(payload) {
  return {
    name: String(payload?.name ?? '').trim(),
    email: payload?.email ? String(payload.email).trim().toLowerCase() : undefined,
    password: payload?.password ? String(payload.password) : undefined,
    classTeacherOf: payload?.classTeacherOf ? String(payload.classTeacherOf) : null,
    subjects: normalizeSubjects(payload?.subjects),
    lectureAssignments: normalizeLectureAssignments(payload?.lectureAssignments),
  };
}

export async function createTeacher(payload) {
  const body = normalizeTeacherPayload(payload);
  const { data } = await apiClient.post('/teacher/create', body);
  return data;
}

export async function getAllTeachers({ page = 1, limit = 10, search = '' }) {
  const { data } = await apiClient.get('/teacher/all', {
    params: { page, limit, search },
  });
  return data;
}

export async function getTeacherById(id) {
  const attempts = [
    () => apiClient.get(`/teacher/${id}`),
    () => apiClient.get(`/teacher/detail/${id}`),
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

export async function updateTeacher({ id, payload }) {
  const body = normalizeTeacherPayload(payload);
  const attempts = [
    () => apiClient.patch(`/teacher/${id}`, body),
    () => apiClient.put(`/teacher/${id}`, body),
    () => apiClient.patch(`/teacher/update/${id}`, body),
    () => apiClient.put(`/teacher/update/${id}`, body),
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

export async function deleteTeacher(id) {
  const attempts = [
    () => apiClient.delete(`/teacher/${id}`),
    () => apiClient.delete(`/teacher/delete/${id}`),
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
