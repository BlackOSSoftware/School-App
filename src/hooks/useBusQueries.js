import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBus, deleteBus, getAllBuses, getBusById, updateBus } from '../services/busService';

export const BUS_QUERY_KEYS = {
  all: ['bus'],
  list: (page, limit, search) => ['bus', 'list', page, limit, search],
  detail: id => ['bus', 'detail', id],
};

export function useBusesQuery({ page = 1, limit = 10, search = '' }) {
  return useQuery({
    queryKey: BUS_QUERY_KEYS.list(page, limit, search),
    queryFn: () => getAllBuses({ page, limit, search }),
    placeholderData: previousData => previousData,
  });
}

export function useBusDetailQuery(id, enabled = true) {
  return useQuery({
    queryKey: BUS_QUERY_KEYS.detail(id),
    queryFn: () => getBusById(id),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateBusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateBusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: BUS_QUERY_KEYS.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: BUS_QUERY_KEYS.detail(variables.id) });
      }
    },
  });
}

export function useDeleteBusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUS_QUERY_KEYS.all });
    },
  });
}
