'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface MemberActionMenuProps {
  communityId: string;
  targetMembershipId: string;
  targetUserId: string;
  targetDisplayName: string;
  /** Whether current user has mod+ permissions */
  canModerate: boolean;
}

type ActionType = 'mute' | 'kick' | 'ban';

interface ConversationResponse {
  id: string;
}

const ACTION_STYLES: Record<ActionType, string> = {
  mute: 'text-yellow-400 hover:bg-yellow-900/30',
  kick: 'text-orange-400 hover:bg-orange-900/30',
  ban: 'text-red-400 hover:bg-red-900/30',
};

const ACTION_TYPES: ActionType[] = ['mute', 'kick', 'ban'];

export function MemberActionMenu({
  communityId,
  targetMembershipId,
  targetUserId,
  targetDisplayName,
  canModerate,
}: MemberActionMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
  const [reason, setReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Check friendship status
  const { data: friendshipData } = useQuery({
    queryKey: ['friendship-check', targetUserId],
    queryFn: () =>
      api<{ status: string; friendshipId: string | null; isRequester: boolean }>(
        `/api/friends/check/${targetUserId}`,
      ),
  });

  const sendDm = useMutation({
    mutationFn: async () => {
      const res = await api<ConversationResponse>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId },
      });
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      router.push(`/dm/${data.id}`);
      setOpen(false);
    },
  });

  const friendRequestMutation = useMutation({
    mutationFn: () =>
      api('/api/friends/request', { method: 'POST', body: { userId: targetUserId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-check', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setOpen(false);
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-check', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setOpen(false);
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}/accept`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship-check', targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      setOpen(false);
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setConfirmAction(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modAction = useMutation({
    mutationFn: ({ action, reason }: { action: ActionType; reason: string }) =>
      api(`/api/members/${targetMembershipId}/${action}`, {
        method: 'POST',
        body: { reason: reason || undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', communityId] });
      setOpen(false);
      setConfirmAction(null);
      setReason('');
    },
  });

  const handleConfirm = () => {
    if (!confirmAction) return;
    modAction.mutate({ action: confirmAction, reason });
  };

  const friendshipStatus = friendshipData?.status ?? 'none';
  const friendshipId = friendshipData?.friendshipId;
  const isFriendRequestRequester = friendshipData?.isRequester ?? false;

  return (
    <div
      ref={menuRef}
      className="relative"
      data-testid="member-action-root"
      data-target-user-id={targetUserId}
    >
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setConfirmAction(null);
        }}
        data-testid="member-action-trigger"
        className="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-300"
        title={t('memberAction.title')}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && !confirmAction && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
          data-testid="member-action-menu"
        >
          {/* DM button */}
          <button
            onClick={() => {
              sendDm.mutate();
              setOpen(false);
            }}
            data-testid="member-action-dm-button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
          >
            {t('dm.sendDm')}
          </button>

          {/* Friend actions */}
          {friendshipStatus === 'none' && (
            <button
              onClick={() => friendRequestMutation.mutate()}
              data-testid="member-action-add-friend-button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            >
              {t('friend.add')}
            </button>
          )}
          {friendshipStatus === 'accepted' && friendshipId && (
            <button
              onClick={() => removeFriendMutation.mutate(friendshipId)}
              data-testid="member-action-remove-friend-button"
              className="flex w-full items-center px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30"
            >
              {t('friend.remove')}
            </button>
          )}
          {friendshipStatus === 'pending' && isFriendRequestRequester && (
            <span className="block px-3 py-2 text-xs text-gray-500">
              {t('friend.requestSent')}
            </span>
          )}
          {friendshipStatus === 'pending' && !isFriendRequestRequester && friendshipId && (
            <>
              <button
                onClick={() => acceptFriendMutation.mutate(friendshipId)}
                data-testid="member-action-accept-friend-button"
                className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                {t('friend.accept')}
              </button>
              <button
                onClick={() => removeFriendMutation.mutate(friendshipId)}
                data-testid="member-action-decline-friend-button"
                className="flex w-full items-center px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/30"
              >
                {t('friend.decline')}
              </button>
            </>
          )}

          {canModerate && (
            <div className="my-1 h-px bg-gray-700" />
          )}
          {canModerate && ACTION_TYPES.map((actionType) => (
            <button
              key={actionType}
              onClick={() => setConfirmAction(actionType)}
              data-testid={`member-action-${actionType}-button`}
              data-action-type={actionType}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${ACTION_STYLES[actionType]}`}
            >
              {t(`memberAction.${actionType}`)}
            </button>
          ))}
        </div>
      )}

      {open && confirmAction && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl"
          data-testid="member-action-confirm-dialog"
          data-action-type={confirmAction}
        >
          <p className="text-sm font-medium text-gray-200">
            {t(`memberAction.${confirmAction}Confirm`, { name: targetDisplayName })}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t(`memberAction.${confirmAction}Desc`)}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('memberAction.reasonPlaceholder')}
            rows={2}
            data-testid="member-action-reason-input"
            className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmAction(null);
                setReason('');
              }}
              data-testid="member-action-cancel-button"
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={modAction.isPending}
              data-testid="member-action-confirm-button"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                confirmAction === 'ban'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmAction === 'kick'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {modAction.isPending ? t('memberAction.processing') : t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
