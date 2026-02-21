import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTeacher,
  deleteTeacher,
  getAllTeachers,
  getTeacherById,
  getTeacherClassesOverview,
  getTeacherStudentsByClass,
  updateTeacher,
} from '../services/teacherService';

export const TEACHER_QUERY_KEYS = {
  all: ['teachers'],
  list: (page, limit, search) => ['teachers', 'list', page, limit, search],
  detail: id => ['teachers', 'detail', id],
  meClasses: ['teachers', 'me-classes'],
  meClassStudents: (classId, page, limit) => ['teachers', 'me-class-students', classId, page, limit],
};

export function useTeachersQuery(page = 1, limit = 10, search = '') {
  return useQuery({
    queryKey: TEACHER_QUERY_KEYS.list(page, limit, search),
    queryFn: () => getAllTeachers({ page, limit, search }),
    placeholderData: previousData => previousData,
  });
}

export function useTeacherDetailQuery(id, enabled = true) {
  return useQuery({
    queryKey: TEACHER_QUERY_KEYS.detail(id),
    queryFn: () => getTeacherById(id),
    enabled: Boolean(id) && enabled,
  });
}

export function useTeacherClassesOverviewQuery() {
  return useQuery({
    queryKey: TEACHER_QUERY_KEYS.meClasses,
    queryFn: getTeacherClassesOverview,
  });
}

export function useTeacherStudentsByClassQuery({ classId, page = 1, limit = 10, enabled = true }) {
  return useQuery({
    queryKey: TEACHER_QUERY_KEYS.meClassStudents(classId, page, limit),
    queryFn: () => getTeacherStudentsByClass({ classId, page, limit }),
    enabled: Boolean(classId) && enabled,
    placeholderData: previousData => previousData,
  });
}

export function useCreateTeacherMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all });
    },
  });
}

export function useUpdateTeacherMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTeacher,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.detail(variables.id) });
      }
    },
  });
}

export function useDeleteTeacherMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHER_QUERY_KEYS.all });
    },
  });
}
