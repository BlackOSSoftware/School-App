import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createStudent,
  deleteStudent,
  getAllStudents,
  getStudentById,
  transitionStudentsToSession,
  updateStudent,
} from '../services/studentService';

export const STUDENT_QUERY_KEYS = {
  all: ['students'],
  list: (page, limit, search, classId) => ['students', 'list', page, limit, search, classId],
  detail: id => ['students', 'detail', id],
  sessionTransition: ['students', 'session-transition'],
};

export function useStudentsQuery({ page = 1, limit = 10, search = '', classId = '', sessionId = '' }) {
  return useQuery({
    queryKey: STUDENT_QUERY_KEYS.list(page, limit, search, `${classId}:${sessionId}`),
    queryFn: () => getAllStudents({ page, limit, search, classId, sessionId }),
    placeholderData: previousData => previousData,
  });
}

export function useStudentDetailQuery(id, enabled = true) {
  return useQuery({
    queryKey: STUDENT_QUERY_KEYS.detail(id),
    queryFn: () => getStudentById(id),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.all });
    },
  });
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStudent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.detail(variables.id) });
      }
    },
  });
}

export function useDeleteStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.all });
    },
  });
}

export function useSessionTransitionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: transitionStudentsToSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: STUDENT_QUERY_KEYS.sessionTransition });
    },
  });
}
