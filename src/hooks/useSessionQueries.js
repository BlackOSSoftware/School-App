import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSession,
  getActiveSession,
  getAllSessions,
  updateSession,
} from '../services/sessionService';

export const SESSION_QUERY_KEYS = {
  all: ['sessions'],
  list: (page, limit) => ['sessions', 'list', page, limit],
  active: ['sessions', 'active'],
};

export function useSessionsQuery(page = 1, limit = 5) {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.list(page, limit),
    queryFn: () => getAllSessions({ page, limit }),
    placeholderData: previousData => previousData,
  });
}

export function useActiveSessionQuery() {
  return useQuery({
    queryKey: SESSION_QUERY_KEYS.active,
    queryFn: getActiveSession,
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
    },
  });
}

export function useUpdateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.all });
    },
  });
}
