import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminAnnouncement,
  createTeacherAnnouncement,
  getMyAnnouncements,
} from '../services/announcementService';

export const ANNOUNCEMENT_QUERY_KEYS = {
  all: ['announcements'],
  me: (page, limit) => ['announcements', 'me', page, limit],
};

export function useMyAnnouncementsQuery({ page = 1, limit = 10, enabled = true }) {
  return useQuery({
    queryKey: ANNOUNCEMENT_QUERY_KEYS.me(page, limit),
    queryFn: () => getMyAnnouncements({ page, limit }),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: previousData => previousData,
  });
}

export function useCreateAdminAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.all });
    },
  });
}

export function useCreateTeacherAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeacherAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.all });
    },
  });
}
