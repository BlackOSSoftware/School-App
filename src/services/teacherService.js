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
      classId: normalizeEntityId(item?.classId),
      subject: String(item?.subject ?? '').trim().toUpperCase(),
    }))
    .filter(item => item.subject && item.classId);
}

function normalizeTeacherPayload(payload) {
  const body = {
    name: String(payload?.name ?? '').trim(),
    email: payload?.email ? String(payload.email).trim().toLowerCase() : '',
    subjects: normalizeSubjects(payload?.subjects),
  };
  const password = String(payload?.password ?? '').trim();

  const classTeacherOf = normalizeEntityId(payload?.classTeacherOf);
  const lectureAssignments = normalizeLectureAssignments(payload?.lectureAssignments);

  if (password) {
    body.password = password;
  }
  if (classTeacherOf) {
    body.classTeacherOf = classTeacherOf;
  }
  if (lectureAssignments.length) {
    body.lectureAssignments = lectureAssignments;
  }

  return body;
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
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid teacher id.');
  }

  const attempts = [
    () => apiClient.get(`/teacher/${normalizedId}`),
    () => apiClient.get(`/teacher/detail/${normalizedId}`),
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
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid teacher id.');
  }

  const body = normalizeTeacherPayload(payload);
  const attempts = [
    () => apiClient.patch(`/teacher/${normalizedId}`, body),
    () => apiClient.put(`/teacher/${normalizedId}`, body),
    () => apiClient.patch(`/teacher/update/${normalizedId}`, body),
    () => apiClient.put(`/teacher/update/${normalizedId}`, body),
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
  const normalizedId = normalizeEntityId(id);
  if (!normalizedId) {
    throw new Error('Invalid teacher id.');
  }

  const attempts = [
    () => apiClient.delete(`/teacher/${normalizedId}`),
    () => apiClient.delete(`/teacher/delete/${normalizedId}`),
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

function normalizePagination(payload = {}) {
  return {
    page: Number(payload?.page ?? 1),
    limit: Number(payload?.limit ?? 10),
    totalPages: Number(payload?.totalPages ?? 1),
    hasNextPage: Boolean(payload?.hasNextPage),
    hasPrevPage: Boolean(payload?.hasPrevPage),
    total: Number(payload?.total ?? payload?.totalStudents ?? 0),
  };
}

function normalizeClassItem(item) {
  const id = normalizeEntityId(item?._id ?? item?.id);
  return {
    id,
    name: String(item?.name ?? '').trim(),
    section: String(item?.section ?? '').trim(),
    label: `${String(item?.name ?? '').trim()}${item?.section ? ` - ${String(item.section).trim()}` : ''}`.trim(),
  };
}

function normalizeStudentItem(item) {
  return {
    id: normalizeEntityId(item?._id ?? item?.id),
    name: String(item?.name ?? '').trim(),
    scholarNumber: String(item?.scholarNumber ?? '').trim(),
    parentName: String(item?.parentName ?? '').trim(),
    phoneNumber: String(item?.phoneNumber ?? '').trim(),
    status: String(item?.status ?? '').trim().toLowerCase() || 'active',
    classInfo: normalizeClassItem(item?.classId),
    sessionName: String(item?.sessionId?.name ?? '').trim(),
  };
}

export async function getTeacherClassesOverview() {
  const { data } = await apiClient.get('/teacher/me/classes');
  const payload = data?.data ?? {};

  const teacher = payload?.teacher ?? {};
  const classTeacherOf = teacher?.classTeacherOf ? normalizeClassItem(teacher.classTeacherOf) : null;
  const lectureAssignments = Array.isArray(teacher?.lectureAssignments)
    ? teacher.lectureAssignments
      .map(item => ({
        classInfo: normalizeClassItem(item?.classId),
        subject: String(item?.subject ?? '').trim().toUpperCase(),
      }))
      .filter(item => item.classInfo.id && item.subject)
    : [];

  const assignedClasses = Array.isArray(payload?.assignedClasses)
    ? payload.assignedClasses.map(normalizeClassItem).filter(item => item.id)
    : [];

  const students = Array.isArray(payload?.students)
    ? payload.students.map(normalizeStudentItem).filter(item => item.id)
    : [];

  return {
    success: Boolean(data?.success),
    teacher: {
      id: normalizeEntityId(teacher?.id ?? teacher?._id),
      name: String(teacher?.name ?? '').trim(),
      email: String(teacher?.email ?? '').trim(),
      classTeacherOf,
      lectureAssignments,
    },
    assignedClasses,
    students,
    ...normalizePagination(payload),
  };
}

export async function getTeacherStudentsByClass({ classId, page = 1, limit = 10 }) {
  const normalizedClassId = normalizeEntityId(classId);
  if (!normalizedClassId) {
    throw new Error('Invalid class id.');
  }

  const { data } = await apiClient.get(`/teacher/me/students/${normalizedClassId}`, {
    params: { page, limit },
  });

  const payload = data?.data;
  const list = Array.isArray(payload) ? payload : Array.isArray(data?.data) ? data.data : [];

  return {
    success: Boolean(data?.success),
    students: list.map(normalizeStudentItem).filter(item => item.id),
    ...normalizePagination(data),
  };
}
