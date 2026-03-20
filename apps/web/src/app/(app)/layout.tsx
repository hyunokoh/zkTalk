'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { CommunityRail } from '@/components/CommunityRail';
import { api } from '@/lib/api';
import type { Community } from '@zktalk/shared';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
  }, [isLoading, user, router]);

  const { data: communities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => api<Community[]>('/api/communities'),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <CommunityRail communities={communities} />
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}
