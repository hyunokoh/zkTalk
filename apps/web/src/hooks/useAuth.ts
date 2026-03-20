'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

interface UseAuthOptions {
  redirectTo?: string;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo } = options;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, redirectTo, router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
