import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface AuthResponse {
  authenticated: boolean;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch('/api/auth/me'),
    staleTime: Infinity, // Never auto-refetch unless manually invalidated
    retry: false, // Don't retry 401 errors
  });

  return {
    isAuthenticated: data?.authenticated ?? false,
    isLoading,
    error,
  };
}
