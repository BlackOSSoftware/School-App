import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTeacherContentByType, getAdminHomework, getStudentMyContent, getTeacherMyContent, updateAdminHomework, deleteAdminHomework, updateTeacherHomework, deleteTeacherHomework } from '../services/contentService';

export const CONTENT_QUERY_KEYS = {
  all: ['content'],
  teacherList: ({ type, page, limit, classId, subject }) => [
    'content',
    'teacher',
    'list',
    type,
    page,
    limit,
    classId,
    subject,
  ],
  studentList: ({ type, page, limit, subject }) => [
    'content',
    'student',
    'list',
    type,
    page,
    limit,
    subject,
  ],
};

export function useTeacherMyContentQuery({ type, page, limit, classId, subject, enabled = true }) {
  return useQuery({
    queryKey: CONTENT_QUERY_KEYS.teacherList({ type, page, limit, classId, subject }),
    queryFn: () => getTeacherMyContent({ type, page, limit, classId, subject }),
    enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useStudentMyContentQuery({ type, page, limit, subject, enabled = true }) {
  return useQuery({
    queryKey: CONTENT_QUERY_KEYS.studentList({ type, page, limit, subject }),
    queryFn: () => getStudentMyContent({ type, page, limit, subject }),
    enabled,
    staleTime: 20 * 1000,
    placeholderData: previousData => previousData,
  });
}

export function useAdminHomeworkQuery({ page, limit = 10, search = '' }) {
  return useQuery({
    queryKey: ['content', 'admin', 'homework', page, limit, search],
    queryFn: () => getAdminHomework({ page, limit, search }),
    staleTime: 0,
  });
}

export function useAdminHomeworkMutations() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.all });
  const update = useMutation({ mutationFn: updateAdminHomework, onSuccess });
  const remove = useMutation({ mutationFn: deleteAdminHomework, onSuccess });
  return { update, remove };
}

export function useTeacherHomeworkMutations() {
  const client = useQueryClient();
  const onSuccess = () => client.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.all });
  const update = useMutation({ mutationFn: updateTeacherHomework, onSuccess });
  const remove = useMutation({ mutationFn: deleteTeacherHomework, onSuccess });
  return { update, remove };
}

export function useCreateTeacherContentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeacherContentByType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.all });
    },
  });
}
