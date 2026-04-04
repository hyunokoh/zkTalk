'use client';

import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';

interface NewDmModalProps {
  onClose: () => void;
  /** Pre-fill for direct DM from member action menu */
  targetUserId?: string;
  targetDisplayName?: string;
}

type TabMode = 'direct' | 'group';

interface SearchUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
}

interface ConversationResponse {
  id: string;
}

export function NewDmModal({ onClose, targetUserId, targetDisplayName }: NewDmModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<TabMode>(targetUserId ? 'direct' : 'direct');
  const [directQuery, setDirectQuery] = useState(targetDisplayName ?? '');
  const [selectedDirectUser, setSelectedDirectUser] = useState<SearchUser | null>(
    targetUserId && targetDisplayName
      ? {
          id: targetUserId,
          displayName: targetDisplayName,
          username: targetDisplayName,
          avatarUrl: null,
        }
      : null,
  );
  const [groupQuery, setGroupQuery] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<SearchUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const deferredDirectQuery = useDeferredValue(directQuery.trim());
  const deferredGroupQuery = useDeferredValue(groupQuery.trim());

  const fetchUserResults = async (query: string) => {
    const res = await api<{ users: SearchUser[] }>(
      `/api/dm/users/search?q=${encodeURIComponent(query)}`,
    );
    return res.users;
  };

  const directSearch = useQuery({
    queryKey: ['dm-user-search', deferredDirectQuery],
    enabled: mode === 'direct' && !targetUserId && deferredDirectQuery.length > 0,
    queryFn: () => fetchUserResults(deferredDirectQuery),
    staleTime: 10_000,
  });

  const groupSearch = useQuery({
    queryKey: ['dm-user-search', deferredGroupQuery],
    enabled: mode === 'group' && deferredGroupQuery.length > 0,
    queryFn: () => fetchUserResults(deferredGroupQuery),
    staleTime: 10_000,
  });

  // Create 1:1 DM
  const createDirect = useMutation({
    mutationFn: async (targetId: string) => {
      return api<ConversationResponse>('/api/dm/conversations', {
        method: 'POST',
        body: { targetUserId: targetId },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      router.push(`/dm/${data.id}`);
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Create group DM
  const createGroup = useMutation({
    mutationFn: async (params: { participantUserIds: string[]; name?: string }) => {
      return api<ConversationResponse>('/api/dm/conversations/group', {
        method: 'POST',
        body: params,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
      router.push(`/dm/${data.id}`);
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleDirectSubmit = async () => {
    setError('');
    if (targetUserId) {
      createDirect.mutate(targetUserId);
      return;
    }
    const fallbackUser =
      directSearch.data?.length === 1 &&
      directSearch.data[0] &&
      [directSearch.data[0].username, directSearch.data[0].displayName].some(
        (value) => value.toLowerCase() === deferredDirectQuery.toLowerCase(),
      )
        ? directSearch.data[0]
        : null;
    const user = selectedDirectUser ?? fallbackUser;
    if (!user) {
      setError(t('dm.userRequired'));
      return;
    }
    createDirect.mutate(user.id);
  };

  const handleGroupSubmit = () => {
    setError('');
    const ids = selectedGroupUsers.map((user) => user.id);
    if (ids.length < 2) {
      setError(t('dm.groupNeedsTwoMembers'));
      return;
    }
    createGroup.mutate({
      participantUserIds: ids,
      name: groupName.trim() || undefined,
    });
  };

  const directResults = directSearch.data ?? [];
  const groupResults = (groupSearch.data ?? []).filter(
    (user) => !selectedGroupUsers.some((selectedUser) => selectedUser.id === user.id),
  );
  const isPending = createDirect.isPending || createGroup.isPending;

  function renderUserResult(
    user: SearchUser,
    actionLabel: string,
    onSelect: (user: SearchUser) => void,
  ) {
    return (
      <button
        key={user.id}
        type="button"
        onClick={() => onSelect(user)}
        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-500 dark:hover:bg-gray-700"
      >
        <UserAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.displayName}
          </div>
          <div className="truncate text-xs text-gray-500 dark:text-gray-400">
            @{user.username}
          </div>
        </div>
        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
          {actionLabel}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('dm.new')}
        </h3>

        {/* Tab toggle */}
        {!targetUserId && (
          <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
            <button
              onClick={() => setMode('direct')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'direct'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t('dm.oneToOne')}
            </button>
            <button
              onClick={() => setMode('group')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'group'
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-600 dark:text-gray-100'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t('dm.group')}
            </button>
          </div>
        )}

        {mode === 'direct' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                {t('dm.selectUser')}
              </label>
              <input
                type="text"
                value={directQuery}
                onChange={(e) => {
                  setDirectQuery(e.target.value);
                  setSelectedDirectUser(null);
                  setError('');
                }}
                placeholder={t('dm.searchUsers')}
                disabled={!!targetUserId}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
              {selectedDirectUser && (
                <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-300">
                  {t('dm.selectedUser', { name: selectedDirectUser.displayName })}
                </p>
              )}
            </div>

            {!targetUserId && deferredDirectQuery && (
              <div className="space-y-2">
                {directSearch.isLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('dm.searchingUsers')}
                  </p>
                )}
                {!directSearch.isLoading && directResults.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('dm.noUserResults')}
                  </p>
                )}
                {directResults.map((user) =>
                  renderUserResult(user, t('dm.selectSearchResult'), (selectedUser) => {
                    setSelectedDirectUser(selectedUser);
                    setDirectQuery(selectedUser.username);
                    setError('');
                  }),
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'group' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                {t('dm.groupName')} <span className="text-gray-400">{t('common.optional')}</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('dm.groupName')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
                {t('dm.addMembers')}
              </label>
              <input
                type="text"
                value={groupQuery}
                onChange={(e) => {
                  setGroupQuery(e.target.value);
                  setError('');
                }}
                placeholder={t('dm.searchUsers')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('dm.searchToAddMembers')}</p>
            </div>

            {selectedGroupUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedGroupUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroupUsers((prev) => prev.filter((item) => item.id !== user.id));
                    }}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200"
                  >
                    {user.displayName} (@{user.username}) ×
                  </button>
                ))}
              </div>
            )}

            {deferredGroupQuery && (
              <div className="space-y-2">
                {groupSearch.isLoading && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('dm.searchingUsers')}
                  </p>
                )}
                {!groupSearch.isLoading && groupResults.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('dm.noUserResults')}
                  </p>
                )}
                {groupResults.map((user) =>
                  renderUserResult(user, t('dm.addMembers'), (selectedUser) => {
                    setSelectedGroupUsers((prev) => [...prev, selectedUser]);
                    setGroupQuery('');
                    setError('');
                  }),
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={mode === 'direct' ? handleDirectSubmit : handleGroupSubmit}
            disabled={isPending || (mode === 'direct' && !selectedDirectUser && !targetUserId)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? t('dm.creating') : t('dm.startConversation')}
          </button>
        </div>
      </div>
    </div>
  );
}
