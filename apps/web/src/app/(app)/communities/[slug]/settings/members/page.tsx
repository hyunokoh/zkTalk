'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import { UserAvatar } from '@/components/UserAvatar';
import { MemberActionMenu } from '@/components/MemberActionMenu';
import type { Community } from '@zktalk/shared';

interface Member {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface Role {
  id: string;
  name: string;
  communityId: string;
  isSystemRole: boolean;
  priority: number;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: 'bg-purple-900/50 text-purple-300 border-purple-700',
  admin: 'bg-blue-900/50 text-blue-300 border-blue-700',
  moderator: 'bg-green-900/50 text-green-300 border-green-700',
  member: 'bg-gray-800 text-gray-400 border-gray-700',
  guest: 'bg-gray-800 text-gray-500 border-gray-700',
};

const ROLE_TRANSLATION_KEYS: Record<string, string> = {
  owner: 'members.owner',
  admin: 'members.admin',
  moderator: 'members.moderator',
  member: 'members.member',
  guest: 'members.guest',
};

export default function MembersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', community?.id],
    queryFn: async () => {
      const res = await api<{ members: Member[] }>(
        `/api/communities/${community!.id}/members`,
      );
      return res.members;
    },
    enabled: !!community,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles', community?.id],
    queryFn: async () => {
      const res = await api<{ roles: Role[] }>(
        `/api/communities/${community!.id}/roles`,
      );
      return res.roles;
    },
    enabled: !!community,
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ targetUserId, role }: { targetUserId: string; role: string }) =>
      api(`/api/communities/${community!.id}/members/${targetUserId}/role`, {
        method: 'PATCH',
        body: { role },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', community?.id] });
    },
  });

  const {
    isAdmin,
    canManageModeration,
    isLoading: roleLoading,
  } = useCommunityRole(community?.id);

  // Assignable roles (exclude 'owner')
  const assignableRoles = roles.filter((r) => r.name !== 'owner');

  const filteredMembers = search.trim()
    ? members.filter((m) =>
        m.displayName.toLowerCase().includes(search.toLowerCase()),
      )
    : members;

  if (isLoading || !community || roleLoading) {
    return (
      <div
        className="flex h-full items-center justify-center text-gray-400"
        data-testid="community-members-loading"
      >
        {t('members.loading')}
      </div>
    );
  }

  if (!canManageModeration) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 text-gray-400"
        data-testid="community-members-access-denied"
      >
        <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0a2 2 0 100-4 2 2 0 000 4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <p className="text-sm">{t('mod.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6" data-testid="community-members-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">{t('members.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('members.count', { count: members.length })}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('members.search')}
          data-testid="community-members-search-input"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Members list */}
      <div className="mt-6 space-y-1" data-testid="community-members-list">
        {filteredMembers.length === 0 ? (
          <p
            className="py-8 text-center text-sm text-gray-500"
            data-testid="community-members-empty-state"
          >
            {t('members.empty')}
          </p>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              data-testid="member-row"
              data-user-id={member.userId}
              data-member-role={member.role}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-800/60"
            >
              {/* Avatar */}
              <UserAvatar
                displayName={member.displayName}
                avatarUrl={member.avatarUrl}
                size="sm"
              />

              {/* Name + Role */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-200">
                    {member.displayName}
                  </span>
                  <span
                    data-testid="member-role-badge"
                    className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      ROLE_BADGE_STYLES[member.role] ?? ROLE_BADGE_STYLES.member
                    }`}
                  >
                    {t(ROLE_TRANSLATION_KEYS[member.role] ?? 'members.member')}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t('members.joinedAt')}{' '}
                  {new Date(member.joinedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Role assignment dropdown (admin only, not for owner) */}
              {isAdmin && member.userId !== user?.id && member.role !== 'owner' && (
                <select
                  value={member.role}
                  data-testid="member-role-select"
                  onChange={(e) =>
                    assignRoleMutation.mutate({
                      targetUserId: member.userId,
                      role: e.target.value,
                    })
                  }
                  disabled={assignRoleMutation.isPending}
                  className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {t(ROLE_TRANSLATION_KEYS[r.name] ?? 'members.member')}
                    </option>
                  ))}
                </select>
              )}

              {/* Admin actions */}
              {canManageModeration &&
                member.userId !== user?.id &&
                member.role !== 'owner' &&
                member.role !== 'admin' && (
                <MemberActionMenu
                  communityId={community.id}
                  targetMembershipId={member.id}
                  targetUserId={member.userId}
                  targetDisplayName={member.displayName}
                  canModerate={canManageModeration}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
