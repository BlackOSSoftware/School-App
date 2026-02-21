import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminAttendanceSummaryByDate,
  getAdminClassAttendanceByDate,
  getStudentMyAttendanceReport,
  getTeacherClassAttendanceByDate,
  getTeacherStudentAttendanceReport,
  markTeacherClassAttendance,
} from '../services/attendanceService';

export const ATTENDANCE_QUERY_KEYS = {
  all: ['attendance'],
  teacherClassDate: (classId, date) => ['attendance', 'teacher', 'class-date', classId, date],
  teacherStudentReport: (classId, studentId, from, to) => ['attendance', 'teacher', 'student-report', classId, studentId, from, to],
  adminDateSummary: date => ['attendance', 'admin', 'date-summary', date],
  adminClassDate: (classId, date) => ['attendance', 'admin', 'class-date', classId, date],
  studentMeReport: (from, to) => ['attendance', 'student', 'me-report', from, to],
};

export function useTeacherClassAttendanceByDateQuery({ classId, date, enabled = true }) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.teacherClassDate(classId, date),
    queryFn: () => getTeacherClassAttendanceByDate({ classId, date }),
    enabled: Boolean(classId) && Boolean(date) && enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useMarkTeacherClassAttendanceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markTeacherClassAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_QUERY_KEYS.all });
    },
  });
}

export function useTeacherStudentAttendanceReportQuery({ classId, studentId, from, to, enabled = true }) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.teacherStudentReport(classId, studentId, from, to),
    queryFn: () => getTeacherStudentAttendanceReport({ classId, studentId, from, to }),
    enabled: Boolean(classId) && Boolean(studentId) && Boolean(from) && Boolean(to) && enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useAdminAttendanceSummaryByDateQuery({ date, enabled = true }) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.adminDateSummary(date),
    queryFn: () => getAdminAttendanceSummaryByDate(date),
    enabled: Boolean(date) && enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useAdminClassAttendanceByDateQuery({ classId, date, enabled = true }) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.adminClassDate(classId, date),
    queryFn: () => getAdminClassAttendanceByDate({ classId, date }),
    enabled: Boolean(classId) && Boolean(date) && enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useStudentMyAttendanceReportQuery({ from, to, enabled = true }) {
  return useQuery({
    queryKey: ATTENDANCE_QUERY_KEYS.studentMeReport(from, to),
    queryFn: () => getStudentMyAttendanceReport({ from, to }),
    enabled: Boolean(from) && Boolean(to) && enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}
