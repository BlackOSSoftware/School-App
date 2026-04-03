import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminVideo,
  deleteAdminVideo,
  getAdminVideos,
  getStudentVideos,
  getTeacherVideos,
  updateAdminVideo,
} from '../services/videoService';

export const VIDEO_QUERY_KEYS = {
  all: ['videos'],
  adminList: ({ page, limit, search }) => ['videos', 'admin', page, limit, search],
  teacherList: ({ page, limit, search }) => ['videos', 'teacher', page, limit, search],
  studentList: ({ page, limit, search }) => ['videos', 'student', page, limit, search],
};

export function useAdminVideosQuery({ page = 1, limit = 10, search = '', enabled = true } = {}) {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.adminList({ page, limit, search }),
    queryFn: () => getAdminVideos({ page, limit, search }),
    enabled,
    placeholderData: previousData => previousData,
  });
}

export function useTeacherVideosQuery({ page = 1, limit = 20, search = '', enabled = true } = {}) {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.teacherList({ page, limit, search }),
    queryFn: () => getTeacherVideos({ page, limit, search }),
    enabled,
    placeholderData: previousData => previousData,
  });
}

export function useStudentVideosQuery({ page = 1, limit = 20, search = '', enabled = true } = {}) {
  return useQuery({
    queryKey: VIDEO_QUERY_KEYS.studentList({ page, limit, search }),
    queryFn: () => getStudentVideos({ page, limit, search }),
    enabled,
    placeholderData: previousData => previousData,
  });
}

export function useCreateAdminVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.all });
    },
  });
}

export function useUpdateAdminVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.all });
    },
  });
}

export function useDeleteAdminVideoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAdminVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VIDEO_QUERY_KEYS.all });
    },
  });
}
