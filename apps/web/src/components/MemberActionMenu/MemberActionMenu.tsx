'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MemberActionMenuProps {
  communityId: string;
  targetUserId: string;
  targetDisplayName: string;
  /** Whether current user has mod+ permissions */
  canModerate: boolean;
}

type ActionType = 'mute' | 'kick' | 'ban';

const ACTIONS: { type: ActionType; label: string; description: string; colorClass: string }[] = [
  {
    type: 'mute',
    label: 'Mute',
    description: 'Prevent this user from sending messages',
    colorClass: 'text-yellow-400 hover:bg-yellow-900/30',
  },
  {
    type: 'kick',
    label: 'Kick',
    description: 'Remove this user from the community',
    colorClass: 'text-orange-400 hover:bg-orange-900/30',
  },
  {
    type: 'ban',
    label: 'Ban',
    description: 'Permanently ban this user',
    colorClass: 'text-red-400 hover:bg-red-900/30',
  },
];

export function MemberActionMenu({
  communityId,
  targetUserId,
  targetDisplayName,
  canModerate,
}: MemberActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
  const [reason, setReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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
      api(`/api/communities/${communityId}/moderation`, {
        method: 'POST',
        body: {
          actionType: action,
          targetUserId,
          reason: reason || undefined,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', communityId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', communityId] });
      setOpen(false);
      setConfirmAction(null);
      setReason('');
    },
  });

  if (!canModerate) return null;

  const handleConfirm = () => {
    if (!confirmAction) return;
    modAction.mutate({ action: confirmAction, reason });
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => {
          setOpen((prev) => !prev);
          setConfirmAction(null);
        }}
        className="flex h-7 w-7 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-700 hover:text-gray-300"
        title="Member actions"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && !confirmAction && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
          {ACTIONS.map((action) => (
            <button
              key={action.type}
              onClick={() => setConfirmAction(action.type)}
              className={`flex w-full items-center px-3 py-2 text-left text-sm ${action.colorClass}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {open && confirmAction && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
          <p className="text-sm font-medium text-gray-200">
            {confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}{' '}
            <span className="text-gray-400">{targetDisplayName}</span>?
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {ACTIONS.find((a) => a.type === confirmAction)?.description}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setConfirmAction(null);
                setReason('');
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={modAction.isPending}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 ${
                confirmAction === 'ban'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmAction === 'kick'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {modAction.isPending ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
