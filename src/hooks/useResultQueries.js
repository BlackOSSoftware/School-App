import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAdminResult,
  deleteTeacherResult,
  getAdminStudentResults,
  getClassResultLiveStatus,
  getStudentResults,
  getTeacherStudentResults,
  goLiveClassResults,
  submitTeacherResult,
  updateAdminResult,
  updateTeacherResult,
} from '../services/resultService';

export const RESULT_QUERY_KEYS = {
  all: ['results'],
  studentMe: ['results', 'student-me'],
  teacherStudent: studentId => ['results', 'teacher-student', studentId],
  adminStudent: studentId => ['results', 'admin-student', studentId],
  classLiveStatus: classId => ['results', 'class-live-status', classId || 'none'],
};

export function useStudentResultsQuery(enabled = true) {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.studentMe,
    queryFn: getStudentResults,
    enabled,
  });
}

export function useAdminStudentResultsQuery(studentId, enabled = true) {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.adminStudent(studentId),
    queryFn: () => getAdminStudentResults(studentId),
    enabled: Boolean(studentId) && enabled,
  });
}

export function useTeacherStudentResultsQuery(studentId, enabled = true) {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.teacherStudent(studentId),
    queryFn: () => getTeacherStudentResults(studentId),
    enabled: Boolean(studentId) && enabled,
  });
}

export function useTeacherSubmitResultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitTeacherResult,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(variables.studentId) });
      }
    },
  });
}

export function useTeacherUpdateResultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resultId, payload }) => updateTeacherResult(resultId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(variables.studentId) });
      }
    },
  });
}

export function useTeacherDeleteResultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resultId }) => deleteTeacherResult(resultId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(variables.studentId) });
      }
    },
  });
}

export function useAdminUpdateResultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resultId, payload }) => updateAdminResult(resultId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(variables.studentId) });
      }
    },
  });
}

export function useAdminDeleteResultMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resultId }) => deleteAdminResult(resultId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(variables.studentId) });
      }
    },
  });
}

export function useClassResultLiveStatusQuery(classId, enabled = true) {
  return useQuery({
    queryKey: RESULT_QUERY_KEYS.classLiveStatus(classId),
    queryFn: () => getClassResultLiveStatus(classId),
    enabled: Boolean(classId) && enabled,
  });
}

export function useAdminGoLiveClassResultsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classId => goLiveClassResults(classId),
    onSuccess: (_, classId) => {
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.classLiveStatus(classId) });
      queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.studentMe });
    },
  });
}
