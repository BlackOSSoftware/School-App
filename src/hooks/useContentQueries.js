import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTeacherContentByType, getStudentMyContent, getTeacherMyContent } from '../services/contentService';

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

export function useCreateTeacherContentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeacherContentByType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_QUERY_KEYS.all });
    },
  });
}
