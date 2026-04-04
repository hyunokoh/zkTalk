'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';
import { relativeTime } from '@/lib/time';

interface UserProfileCardProps {
  userId: string;
  communityId?: string;
  onClose: () => void;
  anchorRect?: DOMRect | null;
}

interface MemberInfo {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export function UserProfileCard({ userId, communityId, onClose, anchorRect }: UserProfileCardProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId, communityId],
    queryFn: async () => {
      if (!communityId) {
        return null;
      }

      const res = await api<{ members: MemberInfo[] }>(
        `/api/communities/${communityId}/members`,
      );
      const member = res.members.find((m) => m.userId === userId);
      if (member) {
        return {
          id: member.userId,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          role: member.role,
          joinedAt: member.joinedAt,
        };
      }

      return null;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Position card near the anchor element
  const style: React.CSSProperties = {};
  if (anchorRect) {
    style.position = 'fixed';
    style.left = anchorRect.right + 8;
    style.top = anchorRect.top;
    // Keep it on screen
    if (typeof window !== 'undefined') {
      if (anchorRect.right + 308 > window.innerWidth) {
        style.left = anchorRect.left - 308;
      }
      if (anchorRect.top + 240 > window.innerHeight) {
        style.top = window.innerHeight - 250;
      }
    }
  }

  const roleLabel = user?.role
    ? t(`members.${user.role}` as string) || user.role
    : null;

  return (
    <div
      ref={cardRef}
      style={style}
      className="z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      {isLoading ? (
        <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('common.loading')}
        </div>
      ) : !user ? (
        <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('misc.unknownUser')}
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <UserAvatar
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                {user.displayName}
              </h3>
              {roleLabel && (
                <span className="mt-0.5 inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {roleLabel}
                </span>
              )}
            </div>
          </div>

          {user.joinedAt && (
            <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('members.joinedAt')}: {relativeTime(user.joinedAt)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
