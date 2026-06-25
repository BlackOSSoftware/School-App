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

function normalizeSubjectMarks(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map(item => ({
      subject: String(item?.subject ?? '').trim().toUpperCase(),
      marks: Number(item?.marks ?? 0),
    }))
    .filter(item => item.subject);
}

function normalizeClassInfo(value) {
  if (!value) {
    return null;
  }
  return {
    id: normalizeEntityId(value),
    name: String(value?.name ?? '').trim(),
    section: String(value?.section ?? '').trim(),
    subjects: Array.isArray(value?.subjects)
      ? value.subjects.map(item => String(item ?? '').trim().toUpperCase()).filter(Boolean)
      : [],
    label: `${String(value?.name ?? '').trim()}${value?.section ? ` - ${String(value.section).trim()}` : ''}`.trim(),
  };
}

function normalizeStudentInfo(value) {
  if (!value) {
    return null;
  }
  return {
    id: normalizeEntityId(value),
    name: String(value?.name ?? '').trim(),
    scholarNumber: String(value?.scholarNumber ?? '').trim(),
  };
}

function normalizeSessionInfo(value) {
  if (!value) {
    return null;
  }
  return {
    id: normalizeEntityId(value),
    name: String(value?.name ?? '').trim(),
    startDate: value?.startDate ?? null,
    endDate: value?.endDate ?? null,
  };
}

function normalizeResultRecord(item) {
  return {
    id: normalizeEntityId(item),
    examTitle: String(item?.examTitle ?? '').trim(),
    examType: String(item?.examType ?? '').trim(),
    month: item?.month ? String(item.month).trim() : '',
    examKey: String(item?.examKey ?? '').trim(),
    totalMarks: Number(item?.totalMarks ?? 0),
    outOf: Number(item?.outOf ?? 0),
    subjectMarks: normalizeSubjectMarks(item?.subjectMarks),
    classInfo: normalizeClassInfo(item?.class),
    studentInfo: normalizeStudentInfo(item?.student),
    sessionInfo: normalizeSessionInfo(item?.session),
    createdAt: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
  };
}

export async function submitTeacherResult(payload) {
  const subjectMarks = Array.isArray(payload?.subjectMarks)
    ? payload.subjectMarks.map(item => ({
        subject: String(item?.subject ?? '').trim(),
        marks: Number(item?.marks ?? 0),
      }))
    : [];

  const body = {
    examTitle: String(payload?.examTitle ?? '').trim(),
    examType: String(payload?.examType ?? '').trim(),
    month: payload?.month ? String(payload.month).trim() : '',
    outOf: Number(payload?.outOf ?? 0),
    studentId: normalizeEntityId(payload?.studentId),
    subjectMarks,
  };

  const { data } = await apiClient.post('/result/teacher/submit', body);
  return {
    ...data,
    data: normalizeResultRecord(data?.data),
  };
}

export async function getTeacherStudentResults(studentId) {
  const normalizedId = normalizeEntityId(studentId);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }
  const { data } = await apiClient.get(`/result/teacher/student/${normalizedId}`);
  return {
    ...data,
    data: Array.isArray(data?.data) ? data.data.map(normalizeResultRecord) : [],
  };
}

export async function updateTeacherResult(resultId, payload) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) {
    throw new Error('Invalid result id.');
  }
  const body = {
    examTitle: String(payload?.examTitle ?? '').trim(),
    examType: String(payload?.examType ?? '').trim(),
    month: payload?.month ? String(payload.month).trim() : '',
    outOf: Number(payload?.outOf ?? 0),
    subjectMarks: Array.isArray(payload?.subjectMarks)
      ? payload.subjectMarks.map(item => ({
          subject: String(item?.subject ?? '').trim(),
          marks: Number(item?.marks ?? 0),
        }))
      : [],
  };
  const { data } = await apiClient.put(`/result/teacher/${normalizedResultId}`, body);
  return {
    ...data,
    data: normalizeResultRecord(data?.data),
  };
}

export async function updateAdminResult(resultId, payload) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) {
    throw new Error('Invalid result id.');
  }
  const body = {
    examTitle: String(payload?.examTitle ?? '').trim(),
    examType: String(payload?.examType ?? '').trim(),
    month: payload?.month ? String(payload.month).trim() : '',
    outOf: Number(payload?.outOf ?? 0),
    subjectMarks: Array.isArray(payload?.subjectMarks)
      ? payload.subjectMarks.map(item => ({
          subject: String(item?.subject ?? '').trim(),
          marks: Number(item?.marks ?? 0),
        }))
      : [],
  };
  const { data } = await apiClient.put(`/result/admin/${normalizedResultId}`, body);
  return {
    ...data,
    data: normalizeResultRecord(data?.data),
  };
}

export async function getStudentResults() {
  const { data } = await apiClient.get('/result/student/me');
  return {
    ...data,
    data: Array.isArray(data?.data) ? data.data.map(normalizeResultRecord) : [],
  };
}

export async function getAdminStudentResults(studentId) {
  const normalizedId = normalizeEntityId(studentId);
  if (!normalizedId) {
    throw new Error('Invalid student id.');
  }

  const { data } = await apiClient.get(`/result/admin/student/${normalizedId}`);
  return {
    ...data,
    data: Array.isArray(data?.data) ? data.data.map(normalizeResultRecord) : [],
  };
}
