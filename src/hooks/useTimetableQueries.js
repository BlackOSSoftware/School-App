import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminTimetable,
  createTeacherTimetable,
  deleteAdminTimetable,
  deleteTeacherTimetable,
  getAdminTimetables,
  getStudentTimetables,
  getTeacherTimetables,
  updateAdminTimetable,
  updateTeacherTimetable,
} from '../services/timetableService';

export const TIMETABLE_QUERY_KEYS = {
  all: ['timetables'],
  teacher: (page = 1) => ['timetables', 'teacher', page],
  admin: (classId, page = 1) => ['timetables', 'admin', classId || 'none', page],
  student: (page = 1) => ['timetables', 'student', page],
};

export function useTeacherTimetablesQuery({ page = 1, limit = 20, enabled = true } = {}) {
  return useQuery({
    queryKey: TIMETABLE_QUERY_KEYS.teacher(page),
    queryFn: () => getTeacherTimetables({ page, limit }),
    enabled,
  });
}

export function useAdminTimetablesQuery({ classId, page = 1, limit = 20, enabled = true } = {}) {
  return useQuery({
    queryKey: TIMETABLE_QUERY_KEYS.admin(classId, page),
    queryFn: () => getAdminTimetables({ classId, page, limit }),
    enabled: Boolean(classId) && enabled,
  });
}

export function useStudentTimetablesQuery({ page = 1, limit = 20, enabled = true } = {}) {
  return useQuery({
    queryKey: TIMETABLE_QUERY_KEYS.student(page),
    queryFn: () => getStudentTimetables({ page, limit }),
    enabled,
  });
}

function invalidateAll(queryClient) {
  queryClient.invalidateQueries({ queryKey: TIMETABLE_QUERY_KEYS.all });
}

export function useTeacherTimetableMutations() {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createTeacherTimetable,
    onSuccess: () => invalidateAll(queryClient),
  });
  const updateMutation = useMutation({
    mutationFn: ({ timetableId, payload }) => updateTeacherTimetable(timetableId, payload),
    onSuccess: () => invalidateAll(queryClient),
  });
  const deleteMutation = useMutation({
    mutationFn: timetableId => deleteTeacherTimetable(timetableId),
    onSuccess: () => invalidateAll(queryClient),
  });
  return { createMutation, updateMutation, deleteMutation };
}

export function useAdminTimetableMutations() {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createAdminTimetable,
    onSuccess: () => invalidateAll(queryClient),
  });
  const updateMutation = useMutation({
    mutationFn: ({ timetableId, payload }) => updateAdminTimetable(timetableId, payload),
    onSuccess: () => invalidateAll(queryClient),
  });
  const deleteMutation = useMutation({
    mutationFn: timetableId => deleteAdminTimetable(timetableId),
    onSuccess: () => invalidateAll(queryClient),
  });
  return { createMutation, updateMutation, deleteMutation };
}
