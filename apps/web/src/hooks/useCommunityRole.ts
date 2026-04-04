'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

interface MemberRole {
  roleName: string;
}

export function useCommunityRole(communityId?: string | null) {
  const user = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: ['member-role', communityId, user?.id],
    queryFn: () =>
      api<MemberRole>(`/api/communities/${communityId}/members/${user!.id}/role`),
    enabled: !!communityId && !!user?.id,
    retry: false,
  });

  const roleName = query.data?.roleName ?? null;
  const isOwner = roleName === 'owner';
  const isAdmin = isOwner || roleName === 'admin';
  const isModerator = isAdmin || roleName === 'moderator';

  return {
    ...query,
    roleName,
    isOwner,
    isAdmin,
    isModerator,
    canManageSettings: isAdmin,
    canManageModeration: isModerator,
  };
}
