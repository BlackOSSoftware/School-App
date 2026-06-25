import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdminStudentResults,
  getStudentResults,
  getTeacherStudentResults,
  submitTeacherResult,
  updateAdminResult,
  updateTeacherResult,
} from '../services/resultService';

export const RESULT_QUERY_KEYS = {
  all: ['results'],
  studentMe: ['results', 'student-me'],
  teacherStudent: studentId => ['results', 'teacher-student', studentId],
  adminStudent: studentId => ['results', 'admin-student', studentId],
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
      const studentId = variables?.studentId;
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(studentId) });
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
      const studentId = variables?.studentId;
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(studentId) });
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
      const studentId = variables?.studentId;
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.adminStudent(studentId) });
        queryClient.invalidateQueries({ queryKey: RESULT_QUERY_KEYS.teacherStudent(studentId) });
      }
    },
  });
}
