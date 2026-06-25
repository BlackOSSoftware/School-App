import { useMutation } from '@tanstack/react-query';
import { buildLoginPayload, login } from '../services/authService';

export function getApiErrorMessage(error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  if (!error?.response) {
    return 'Something went wrong';
  }

  return typeof message === 'string' && message.trim().length > 0
    ? message
    : 'Something went wrong';
}

export function useLoginMutation() {
  const mutation = useMutation({
    mutationFn: login,
  });

  const loginWithIdentifier = (formValues) =>
    mutation.mutateAsync(buildLoginPayload(formValues));

  return {
    ...mutation,
    loginWithIdentifier,
  };
}
