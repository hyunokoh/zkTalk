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
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-bg-subtle px-3 py-2 text-left transition-colors hover:border-accent-soft hover:bg-accent-soft dark:bg-bg-subtle/50 dark:hover:border-accent dark:hover:bg-bg-subtle"
      >
        <UserAvatar displayName={user.displayName} avatarUrl={user.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-fg-muted">
            {user.displayName}
          </div>
          <div className="truncate text-xs text-fg-subtle">
            @{user.username}
          </div>
        </div>
        <span className="text-xs font-medium text-accent-strong dark:text-accent">
          {actionLabel}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-xl dark:bg-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-fg-muted">
          {t('dm.new')}
        </h3>

        {/* Tab toggle */}
        {!targetUserId && (
          <div className="mb-4 flex gap-1 rounded-lg bg-bg-hover p-1-subtle">
            <button
              onClick={() => setMode('direct')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'direct'
                  ? 'bg-white text-fg shadow dark:bg-bg-subtle-muted'
                  : 'text-fg-muted hover:text-fg-muted dark:hover:text-fg'
              }`}
            >
              {t('dm.oneToOne')}
            </button>
            <button
              onClick={() => setMode('group')}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'group'
                  ? 'bg-white text-fg shadow dark:bg-bg-subtle-muted'
                  : 'text-fg-muted hover:text-fg-muted dark:hover:text-fg'
              }`}
            >
              {t('dm.group')}
            </button>
          </div>
        )}

        {mode === 'direct' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-fg-muted">
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
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none disabled:opacity-60 dark:bg-bg-subtle dark:placeholder:text-fg-muted"
              />
              {selectedDirectUser && (
                <p className="mt-1 text-xs text-accent-strong dark:text-accent">
                  {t('dm.selectedUser', { name: selectedDirectUser.displayName })}
                </p>
              )}
            </div>

            {!targetUserId && deferredDirectQuery && (
              <div className="space-y-2">
                {directSearch.isLoading && (
                  <p className="text-xs text-fg-subtle">
                    {t('dm.searchingUsers')}
                  </p>
                )}
                {!directSearch.isLoading && directResults.length === 0 && (
                  <p className="text-xs text-fg-subtle">
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
              <label className="mb-1 block text-sm text-fg-muted">
                {t('dm.groupName')} <span className="text-fg-muted">{t('common.optional')}</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('dm.groupName')}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none dark:bg-bg-subtle dark:placeholder:text-fg-muted"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-fg-muted">
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
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none dark:bg-bg-subtle dark:placeholder:text-fg-muted"
              />
              <p className="mt-1 text-xs text-fg-subtle">{t('dm.searchToAddMembers')}</p>
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
                    className="rounded-full border border-accent-soft bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong transition-colors hover:border-accent-soft hover:bg-accent-soft dark:border-accent/40 dark:bg-accent/10 dark:text-accent"
                  >
                    {user.displayName} (@{user.username}) ×
                  </button>
                ))}
              </div>
            )}

            {deferredGroupQuery && (
              <div className="space-y-2">
                {groupSearch.isLoading && (
                  <p className="text-xs text-fg-subtle">
                    {t('dm.searchingUsers')}
                  </p>
                )}
                {!groupSearch.isLoading && groupResults.length === 0 && (
                  <p className="text-xs text-fg-subtle">
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
          <p className="mt-3 text-sm text-danger">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-fg transition-colors hover:bg-bg-hover-muted dark:hover:bg-bg-subtle"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={mode === 'direct' ? handleDirectSubmit : handleGroupSubmit}
            disabled={isPending || (mode === 'direct' && !selectedDirectUser && !targetUserId)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            {isPending ? t('dm.creating') : t('dm.startConversation')}
          </button>
        </div>
      </div>
    </div>
  );
}
