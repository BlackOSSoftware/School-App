import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClass, deleteClass, getAllClasses, updateClass } from '../services/classService';

export const CLASS_QUERY_KEYS = {
  all: ['classes'],
  list: (page, limit) => ['classes', 'list', page, limit],
};

export function useClassesQuery(page = 1, limit = 5) {
  return useQuery({
    queryKey: CLASS_QUERY_KEYS.list(page, limit),
    queryFn: () => getAllClasses({ page, limit }),
    placeholderData: previousData => previousData,
  });
}

export function useCreateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_QUERY_KEYS.all });
    },
  });
}

export function useUpdateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_QUERY_KEYS.all });
    },
  });
}

export function useDeleteClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLASS_QUERY_KEYS.all });
    },
  });
}
