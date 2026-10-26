import { apiClient } from '../api/client';

function normalizeEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const nested = value?._id ?? value?.id ?? value?.$oid ?? '';
    if (typeof nested === 'string') return nested.trim();
    if (nested && typeof nested === 'object' && typeof nested.$oid === 'string') {
      return nested.$oid.trim();
    }
  }
  return '';
}

function normalizeSubjectMarks(items = [], fallbackOutOf = 0) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      const subject = String(item?.subject ?? '').trim().toUpperCase();
      if (!subject) return null;
      const isAbsent = Boolean(item?.isAbsent);
      return {
        subject,
        isAbsent,
        marks: isAbsent ? null : Number(item?.marks ?? 0),
        outOf: Number(item?.outOf ?? fallbackOutOf ?? 0),
      };
    })
    .filter(Boolean);
}

function mapSubjectPayload(items = []) {
  return (Array.isArray(items) ? items : []).map(item => ({
    subject: String(item?.subject ?? '').trim(),
    marks: item?.isAbsent ? 0 : Number(item?.marks ?? 0),
    outOf: Number(item?.outOf ?? 0),
    isAbsent: Boolean(item?.isAbsent),
  }));
}

function normalizeClassInfo(value) {
  if (!value) return null;
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
  if (!value) return null;
  return {
    id: normalizeEntityId(value),
    name: String(value?.name ?? '').trim(),
    scholarNumber: String(value?.scholarNumber ?? '').trim(),
  };
}

function normalizeSessionInfo(value) {
  if (!value) return null;
  return {
    id: normalizeEntityId(value),
    name: String(value?.name ?? '').trim(),
    startDate: value?.startDate ?? null,
    endDate: value?.endDate ?? null,
  };
}

function normalizeResultRecord(item) {
  const outOf = Number(item?.outOf ?? 0);
  const subjectMarks = normalizeSubjectMarks(item?.subjectMarks, outOf);
  const totalOutOf = Number.isFinite(Number(item?.totalOutOf))
    ? Number(item.totalOutOf)
    : subjectMarks.reduce((sum, row) => sum + Number(row.outOf || outOf || 0), 0);

  return {
    id: normalizeEntityId(item),
    examTitle: String(item?.examTitle ?? '').trim(),
    examType: String(item?.examType ?? '').trim(),
    month: item?.month ? String(item.month).trim() : '',
    examKey: String(item?.examKey ?? '').trim(),
    totalMarks: Number(item?.totalMarks ?? 0),
    totalOutOf,
    outOf,
    subjectMarks,
    classInfo: normalizeClassInfo(item?.class),
    studentInfo: normalizeStudentInfo(item?.student),
    sessionInfo: normalizeSessionInfo(item?.session),
    isLive: Boolean(item?.isLive),
    liveAt: item?.liveAt ?? null,
    createdAt: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
  };
}

function buildResultBody(payload) {
  return {
    examTitle: String(payload?.examTitle ?? '').trim(),
    examType: String(payload?.examType ?? '').trim(),
    month: payload?.month ? String(payload.month).trim() : '',
    outOf: Number(payload?.outOf ?? 0),
    subjectMarks: mapSubjectPayload(payload?.subjectMarks),
  };
}

export async function submitTeacherResult(payload) {
  const body = {
    ...buildResultBody(payload),
    studentId: normalizeEntityId(payload?.studentId),
  };
  const { data } = await apiClient.post('/result/teacher/submit', body);
  return { ...data, data: normalizeResultRecord(data?.data) };
}

export async function getTeacherStudentResults(studentId) {
  const normalizedId = normalizeEntityId(studentId);
  if (!normalizedId) throw new Error('Invalid student id.');
  const { data } = await apiClient.get(`/result/teacher/student/${normalizedId}`);
  return {
    ...data,
    data: Array.isArray(data?.data) ? data.data.map(normalizeResultRecord) : [],
  };
}

export async function updateTeacherResult(resultId, payload) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) throw new Error('Invalid result id.');
  const { data } = await apiClient.put(`/result/teacher/${normalizedResultId}`, buildResultBody(payload));
  return { ...data, data: normalizeResultRecord(data?.data) };
}

export async function deleteTeacherResult(resultId) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) throw new Error('Invalid result id.');
  const { data } = await apiClient.delete(`/result/teacher/${normalizedResultId}`);
  return data;
}

export async function updateAdminResult(resultId, payload) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) throw new Error('Invalid result id.');
  const { data } = await apiClient.put(`/result/admin/${normalizedResultId}`, buildResultBody(payload));
  return { ...data, data: normalizeResultRecord(data?.data) };
}

export async function deleteAdminResult(resultId) {
  const normalizedResultId = normalizeEntityId(resultId);
  if (!normalizedResultId) throw new Error('Invalid result id.');
  const { data } = await apiClient.delete(`/result/admin/${normalizedResultId}`);
  return data;
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
  if (!normalizedId) throw new Error('Invalid student id.');
  const { data } = await apiClient.get(`/result/admin/student/${normalizedId}`);
  return {
    ...data,
    data: Array.isArray(data?.data) ? data.data.map(normalizeResultRecord) : [],
  };
}

export async function getClassResultLiveStatus(classId) {
  const normalizedId = normalizeEntityId(classId);
  if (!normalizedId) throw new Error('Invalid class id.');
  const { data } = await apiClient.get(`/result/admin/class/${normalizedId}/live-status`);
  return data?.data || { classId: normalizedId, pending: 0, live: 0 };
}

export async function goLiveClassResults(classId) {
  const normalizedId = normalizeEntityId(classId);
  if (!normalizedId) throw new Error('Invalid class id.');
  const { data } = await apiClient.post('/result/admin/go-live', { classId: normalizedId });
  return data;
}
