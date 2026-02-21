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

function toIsoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeStudentAttendanceItem(item) {
  return {
    studentId: normalizeEntityId(item?.studentId),
    studentName: String(item?.studentName ?? '').trim(),
    scholarNumber: String(item?.scholarNumber ?? '').trim(),
    status: String(item?.status ?? '').trim().toLowerCase() === 'present' ? 'present' : 'absent',
  };
}

function normalizeClassInfo(value) {
  return {
    id: normalizeEntityId(value?.id ?? value?._id),
    name: String(value?.name ?? '').trim(),
    section: String(value?.section ?? '').trim(),
  };
}

function normalizeClassAttendanceResponse(data = {}) {
  const payload = data?.data ?? {};
  return {
    success: Boolean(data?.success),
    message: String(data?.message ?? ''),
    data: {
      class: normalizeClassInfo(payload?.class),
      attendanceTaken: Boolean(payload?.attendanceTaken),
      date: String(payload?.date ?? ''),
      presentCount: Number(payload?.presentCount ?? 0),
      absentCount: Number(payload?.absentCount ?? 0),
      totalStudents: Number(payload?.totalStudents ?? 0),
      presentPercentage: Number(payload?.presentPercentage ?? 0),
      presentStudents: Array.isArray(payload?.presentStudents)
        ? payload.presentStudents.map(normalizeStudentAttendanceItem)
        : [],
      absentStudents: Array.isArray(payload?.absentStudents)
        ? payload.absentStudents.map(normalizeStudentAttendanceItem)
        : [],
    },
  };
}

export async function markTeacherClassAttendance({ classId, date, attendance }) {
  const normalizedClassId = normalizeEntityId(classId);
  if (!normalizedClassId) {
    throw new Error('Invalid class id.');
  }

  const body = {
    date: toIsoDate(date || new Date()),
    attendance: Array.isArray(attendance)
      ? attendance
        .map(item => ({
          studentId: normalizeEntityId(item?.studentId),
          status: String(item?.status ?? '').trim().toLowerCase() === 'present' ? 'present' : 'absent',
        }))
        .filter(item => item.studentId)
      : [],
  };

  const { data } = await apiClient.put(`/attendance/teacher/class/${normalizedClassId}/mark`, body);
  return normalizeClassAttendanceResponse(data);
}

export async function getTeacherClassAttendanceByDate({ classId, date }) {
  const normalizedClassId = normalizeEntityId(classId);
  if (!normalizedClassId) {
    throw new Error('Invalid class id.');
  }

  const { data } = await apiClient.get(`/attendance/teacher/class/${normalizedClassId}/date`, {
    params: { date: toIsoDate(date || new Date()) },
  });
  return normalizeClassAttendanceResponse(data);
}

export async function getTeacherStudentAttendanceReport({ classId, studentId, from, to }) {
  const normalizedClassId = normalizeEntityId(classId);
  const normalizedStudentId = normalizeEntityId(studentId);
  if (!normalizedClassId || !normalizedStudentId) {
    throw new Error('Invalid class or student id.');
  }

  const { data } = await apiClient.get(`/attendance/teacher/class/${normalizedClassId}/student/${normalizedStudentId}/report`, {
    params: {
      from: toIsoDate(from || new Date()),
      to: toIsoDate(to || new Date()),
    },
  });

  return {
    success: Boolean(data?.success),
    data: data?.data ?? {},
  };
}

export async function getAdminAttendanceSummaryByDate(date) {
  const { data } = await apiClient.get('/attendance/admin/date-summary', {
    params: { date: toIsoDate(date || new Date()) },
  });

  const payload = data?.data ?? {};
  return {
    success: Boolean(data?.success),
    data: {
      date: String(payload?.date ?? ''),
      session: payload?.session ?? null,
      data: Array.isArray(payload?.data)
        ? payload.data.map(item => ({
          class: normalizeClassInfo(item?.class),
          attendanceTaken: Boolean(item?.attendanceTaken),
          date: String(item?.date ?? ''),
          totalStudents: Number(item?.totalStudents ?? 0),
          presentCount: Number(item?.presentCount ?? 0),
          absentCount: Number(item?.absentCount ?? 0),
          presentPercentage: Number(item?.presentPercentage ?? 0),
        }))
        : [],
    },
  };
}

export async function getAdminClassAttendanceByDate({ classId, date }) {
  const normalizedClassId = normalizeEntityId(classId);
  if (!normalizedClassId) {
    throw new Error('Invalid class id.');
  }
  const { data } = await apiClient.get(`/attendance/admin/class/${normalizedClassId}/date`, {
    params: { date: toIsoDate(date || new Date()) },
  });
  return normalizeClassAttendanceResponse(data);
}

export async function getStudentMyAttendanceReport({ from, to }) {
  const { data } = await apiClient.get('/attendance/student/me/report', {
    params: {
      from: toIsoDate(from || new Date()),
      to: toIsoDate(to || new Date()),
    },
  });

  return {
    success: Boolean(data?.success),
    data: data?.data ?? {},
  };
}

export function getTodayIsoDate() {
  return toIsoDate(new Date());
}
