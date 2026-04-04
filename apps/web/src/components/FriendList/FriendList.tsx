'use client';

import React from 'react';
import { FormEvent, useDeferredValue, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  buildSharedProfileHref,
  parseSharedProfileText,
  type SharedProfileData,
} from '@/lib/shared-profile';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { UserAvatar } from '@/components/UserAvatar';

interface FriendItem {
  id: string;
  status: 'pending' | 'accepted' | 'blocked';
  isRequester: boolean;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

type TabType = 'accepted' | 'pending' | 'blocked';

interface FriendSearchUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface DmCallTarget {
  community: {
    id: string;
    slug: string;
    name: string;
  };
  channel: {
    id: string;
    name: string;
  };
  voiceChannel: {
    id: string;
    name: string;
  };
  alreadyPromoted: boolean;
}

export function FriendList() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('accepted');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFeedback, setSearchFeedback] = useState('');
  const [sharedLinkInput, setSharedLinkInput] = useState('');
  const [sharedLinkFeedback, setSharedLinkFeedback] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const sharedProfile = useMemo(() => {
    const userId = searchParams.get('profileUserId')?.trim() ?? '';
    if (!userId) {
      return null;
    }

    return {
      userId,
      displayName: searchParams.get('displayName')?.trim() ?? '',
      username: searchParams.get('username')?.trim() ?? '',
    };
  }, [searchParams]);

  const openSharedProfile = (profile: SharedProfileData) => {
    router.replace(buildSharedProfileHref(profile, searchParams));
  };

  const handleSharedLinkSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const profile = parseSharedProfileText(sharedLinkInput);
    if (!profile) {
      setSharedLinkFeedback(t('friend.sharedProfileParseError'));
      return;
    }
    setSharedLinkFeedback('');
    openSharedProfile(profile);
  };

  const handlePasteFromClipboard = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      setSharedLinkFeedback(t('friend.sharedProfileClipboardError'));
      return;
    }

    try {
      const clipboardValue = await navigator.clipboard.readText();
      setSharedLinkInput(clipboardValue);
      const profile = parseSharedProfileText(clipboardValue);
      if (!profile) {
        setSharedLinkFeedback(t('friend.sharedProfileParseError'));
        return;
      }
      setSharedLinkFeedback('');
      openSharedProfile(profile);
    } catch {
      setSharedLinkFeedback(t('friend.sharedProfileClipboardError'));
    }
  };

  const dismissSharedProfile = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('profileUserId');
    nextParams.delete('displayName');
    nextParams.delete('username');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/friends?${nextQuery}` : '/friends');
  };

  const { data } = useQuery({
    queryKey: ['friends', activeTab],
    queryFn: () => api<{ friends: FriendItem[] }>(`/api/friends?status=${activeTab}`),
  });

  const friends = data?.friends ?? [];

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['friend-search', deferredSearchQuery],
    enabled: deferredSearchQuery.length > 0,
    queryFn: async () => {
      const res = await api<{ users: FriendSearchUser[] }>(
        `/api/friends/search?q=${encodeURIComponent(deferredSearchQuery)}`,
      );
      return res.users;
    },
    staleTime: 10_000,
  });

  const { data: sharedFriendshipData } = useQuery({
    queryKey: ['friendship-check', sharedProfile?.userId],
    enabled: !!sharedProfile?.userId,
    queryFn: () =>
      api<{ status: string; friendshipId: string | null; isRequester: boolean }>(
        `/api/friends/check/${sharedProfile!.userId}`,
      ),
  });

  const acceptMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}/accept`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendship-check'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendship-check'] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: (friendshipId: string) =>
      api(`/api/friends/${friendshipId}/block`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendship-check'] });
    },
  });

  const addMutation = useMutation({
    mutationFn: (userId: string) =>
      api('/api/friends/request', {
        method: 'POST',
        body: { userId },
      }),
    onSuccess: () => {
      setSearchFeedback(t('friend.requestSent'));
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendship-check'] });
    },
    onError: (error: Error) => {
      setSearchFeedback(
        error instanceof ApiError ? error.message : t('friend.requestError'),
      );
    },
  });

  const dmMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api<{ conversation?: { id: string }; id?: string }>(
        '/api/dm/conversations',
        {
          method: 'POST',
          body: { targetUserId },
        },
      );
      return res.id ?? res.conversation?.id ?? null;
    },
    onSuccess: (conversationId) => {
      if (!conversationId) return;
      router.push(`/dm/${conversationId}`);
    },
  });

  const callMutation = useMutation({
    mutationFn: async ({
      targetUserId,
      mode,
    }: {
      targetUserId: string;
      mode: 'voice' | 'video';
    }) => {
      const conversation = await api<{ conversation?: { id: string }; id?: string }>(
        '/api/dm/conversations',
        {
          method: 'POST',
          body: { targetUserId },
        },
      );
      const conversationId = conversation.id ?? conversation.conversation?.id ?? null;
      if (!conversationId) {
        throw new Error(t('voice.joinFailed'));
      }
      const callTarget = await api<DmCallTarget>(
        `/api/dm/conversations/${conversationId}/call-target`,
        {
          method: 'POST',
        },
      );
      return { callTarget, mode };
    },
    onSuccess: ({ callTarget, mode }) => {
      router.push(
        `/communities/${callTarget.community.slug}/channels/${callTarget.voiceChannel.id}?joinVoice=${mode}`,
      );
    },
  });

  const tabs: { key: TabType; label: string }[] = [
    { key: 'accepted', label: t('friend.title') },
    { key: 'pending', label: t('friend.pending') },
    { key: 'blocked', label: t('friend.block') },
  ];
  const sharedProfileName =
    sharedProfile?.displayName || sharedProfile?.username || t('friend.sharedProfileUnknown');
  const sharedFriendshipStatus = sharedFriendshipData?.status ?? 'none';
  const sharedFriendshipId = sharedFriendshipData?.friendshipId;
  const isSharedRequester = sharedFriendshipData?.isRequester ?? false;

  return (
    <div data-testid="friend-list">
      <div
        className="mb-5 rounded-lg border border-[#dbe7ef] bg-[#f8fbfd] p-4"
        data-testid="friend-share-guide"
      >
        <h3 className="text-sm font-semibold text-[#23384c]">
          {t('friend.desktopShareGuideTitle')}
        </h3>
        <p className="mt-1 text-xs text-[#5f7486]">
          {t('friend.desktopShareGuideBody')}
        </p>
        <div className="mt-3 space-y-2 text-xs text-[#415a6b]">
          <p>{t('friend.desktopShareGuideStepMobile')}</p>
          <p>{t('friend.desktopShareGuideStepDesktop')}</p>
        </div>
      </div>

      <div
        className="mb-5 space-y-3 rounded-lg border border-[#d4e2eb] bg-white p-4"
        data-testid="friend-shared-profile-input-section"
      >
        <div>
          <h3 className="text-sm font-semibold text-[#23384c]">
            {t('friend.sharedProfileInputTitle')}
          </h3>
          <p className="mt-1 text-xs text-[#5f7486]">
            {t('friend.sharedProfileInputHelp')}
          </p>
        </div>

        <form
          className="space-y-2"
          onSubmit={handleSharedLinkSubmit}
          data-testid="friend-shared-profile-form"
        >
          <textarea
            value={sharedLinkInput}
            onChange={(event) => {
              setSharedLinkInput(event.target.value);
              setSharedLinkFeedback('');
            }}
            placeholder={t('friend.sharedProfileInputPlaceholder')}
            rows={3}
            data-testid="friend-shared-profile-input"
            className="w-full rounded-lg border border-[#d4e2eb] bg-[#f8fbfd] px-3 py-2 text-sm text-[#23384c] placeholder:text-[#7b90a1] focus:border-[#9cc0d6] focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePasteFromClipboard()}
              data-testid="friend-shared-profile-paste-button"
              className="rounded-lg border border-[#d4e2eb] bg-white px-3 py-2 text-xs font-medium text-[#415a6b] transition hover:border-[#c2d5e1] hover:text-[#23384c]"
            >
              {t('friend.sharedProfilePaste')}
            </button>
            <button
              type="submit"
              data-testid="friend-shared-profile-open-button"
              className="rounded-lg bg-[#f5c84c] px-3 py-2 text-xs font-semibold text-[#2a2a2a] transition hover:bg-[#f0be32]"
            >
              {t('friend.sharedProfileOpen')}
            </button>
          </div>
        </form>

        {sharedLinkFeedback && (
          <p className="text-xs text-[#c05621]" data-testid="friend-shared-profile-feedback">
            {sharedLinkFeedback}
          </p>
        )}
      </div>

      {sharedProfile && (
        <div
          className="mb-5 space-y-3 rounded-lg border border-[#d4e2eb] bg-[#f8fbfd] p-4"
          data-testid="friend-shared-profile-card"
          data-profile-user-id={sharedProfile.userId}
          data-friendship-status={sharedFriendshipStatus}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#23384c]">
                {t('friend.sharedProfileTitle')}
              </h3>
              <p className="mt-1 text-xs text-[#5f7486]">
                {sharedProfile.username
                  ? t('friend.sharedProfileBodyWithUsername', {
                      name: sharedProfileName,
                      username: sharedProfile.username,
                    })
                  : t('friend.sharedProfileBody', { name: sharedProfileName })}
              </p>
            </div>
            <button
              onClick={dismissSharedProfile}
              data-testid="friend-shared-profile-dismiss-button"
              className="rounded-full border border-[#d4e2eb] bg-white px-2.5 py-1 text-xs font-medium text-[#5f7486] transition hover:border-[#c2d5e1] hover:text-[#23384c]"
            >
              {t('common.cancel')}
            </button>
          </div>

          <div
            className="flex items-center gap-3 rounded-lg border border-[#d4e2eb] bg-white p-3"
            data-testid="friend-shared-profile-user-row"
          >
            <UserAvatar
              displayName={sharedProfileName}
              avatarUrl={null}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[#23384c]">
                {sharedProfileName}
              </p>
              <p className="text-xs text-[#5f7486]">
                {sharedProfile.username ? `@${sharedProfile.username}` : t('friend.sharedProfilePendingHint')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {sharedFriendshipStatus === 'none' && (
                <button
                  onClick={() => addMutation.mutate(sharedProfile.userId)}
                  disabled={addMutation.isPending}
                  data-testid="friend-shared-profile-add-button"
                  className="rounded-lg bg-[#f5c84c] px-3 py-1.5 text-xs font-semibold text-[#2a2a2a] transition hover:bg-[#f0be32] disabled:opacity-50"
                >
                  {t('friend.add')}
                </button>
              )}
              {sharedFriendshipStatus === 'accepted' && (
                <>
                  <span className="text-xs font-medium text-[#5f7486]">
                    {t('friend.sharedProfileAccepted')}
                  </span>
                  <button
                    onClick={() => dmMutation.mutate(sharedProfile.userId)}
                    disabled={dmMutation.isPending}
                    data-testid="friend-shared-profile-message-button"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t('friend.message')}
                  </button>
                  <button
                    onClick={() => callMutation.mutate({ targetUserId: sharedProfile.userId, mode: 'voice' })}
                    disabled={callMutation.isPending}
                    data-testid="friend-shared-profile-voice-button"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  >
                    {t('voice.join')}
                  </button>
                  <button
                    onClick={() => callMutation.mutate({ targetUserId: sharedProfile.userId, mode: 'video' })}
                    disabled={callMutation.isPending}
                    data-testid="friend-shared-profile-video-button"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  >
                    {t('voice.videoCall')}
                  </button>
                </>
              )}
              {sharedFriendshipStatus === 'pending' && isSharedRequester && (
                <span className="text-xs font-medium text-[#5f7486]">
                  {t('friend.requestSent')}
                </span>
              )}
              {sharedFriendshipStatus === 'pending' && !isSharedRequester && sharedFriendshipId && (
                <>
                  <button
                    onClick={() => acceptMutation.mutate(sharedFriendshipId)}
                    data-testid="friend-shared-profile-accept-button"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    {t('friend.accept')}
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(sharedFriendshipId)}
                    data-testid="friend-shared-profile-decline-button"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  >
                    {t('friend.decline')}
                  </button>
                </>
              )}
              {sharedFriendshipStatus === 'blocked' && (
                <span className="text-xs font-medium text-red-500">
                  {t('friend.sharedProfileBlocked')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="mb-5 space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        data-testid="friend-search-section"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('friend.addByUsername')}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t('friend.addByUsernameHelp')}
          </p>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchFeedback('');
          }}
          placeholder={t('friend.searchUsers')}
          data-testid="friend-search-input"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-400"
        />

        {searchFeedback && (
          <p
            className="text-xs text-gray-500 dark:text-gray-400"
            data-testid="friend-search-feedback"
          >
            {searchFeedback}
          </p>
        )}

        {deferredSearchQuery && (
          <div className="space-y-2">
            {isSearching ? (
              <LoadingState message={t('friend.searchingUsers')} compact />
            ) : searchResults.length === 0 ? (
              <EmptyState
                title={t('friend.noSearchResults')}
                className="border-gray-200 bg-gray-50 px-6 py-10 text-gray-500 shadow-none dark:border-gray-700 dark:bg-gray-800/40"
              />
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  data-testid="friend-search-result"
                  data-user-id={user.id}
                >
                  <UserAvatar
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </p>
                  </div>
                  <button
                    onClick={() => addMutation.mutate(user.id)}
                    disabled={addMutation.isPending}
                    data-testid="friend-search-add-button"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {t('friend.add')}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`friend-tab-${tab.key}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Friend list */}
      <div className="mt-4 space-y-2" data-testid="friend-list-items">
        {friends.length === 0 ? (
          <EmptyState
            title={
              activeTab === 'pending'
                ? t('friend.pending')
                : activeTab === 'blocked'
                  ? t('friend.block')
                  : t('friend.noFriends')
            }
            description={
              activeTab === 'pending'
                ? t('friend.requestSent')
                : activeTab === 'blocked'
                  ? t('friend.sharedProfileBlocked')
                  : t('friend.friendsPageHelp')
            }
            className="border-gray-200 bg-gray-50 px-6 py-12 text-gray-500 shadow-none dark:border-gray-700 dark:bg-gray-800/40"
          />
        ) : friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            data-testid="friend-row"
            data-friendship-id={friend.id}
            data-user-id={friend.user?.id ?? ''}
            data-status={friend.status}
            data-is-requester={friend.isRequester ? 'true' : 'false'}
          >
            {friend.user && (
              <>
                <UserAvatar
                  displayName={friend.user.displayName}
                  avatarUrl={friend.user.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {friend.user.displayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{friend.user.username}
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-1.5">
              {activeTab === 'pending' && !friend.isRequester && (
                <button
                  onClick={() => acceptMutation.mutate(friend.id)}
                  data-testid="friend-row-accept-button"
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  {t('friend.accept')}
                </button>
              )}
              {activeTab === 'pending' && !friend.isRequester && (
                <button
                  onClick={() => removeMutation.mutate(friend.id)}
                  data-testid="friend-row-decline-button"
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  {t('friend.decline')}
                </button>
              )}
              {activeTab === 'pending' && friend.isRequester && (
                <span className="text-xs text-gray-500">{t('friend.requestSent')}</span>
              )}
              {activeTab === 'accepted' && (
                <>
                  {friend.user && (
                    <>
                      <button
                        onClick={() => dmMutation.mutate(friend.user!.id)}
                        data-testid="friend-row-message-button"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        disabled={dmMutation.isPending}
                      >
                        {t('friend.message')}
                      </button>
                      <button
                        onClick={() => callMutation.mutate({ targetUserId: friend.user!.id, mode: 'voice' })}
                        data-testid="friend-row-voice-button"
                        className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        disabled={callMutation.isPending}
                      >
                        {t('voice.join')}
                      </button>
                      <button
                        onClick={() => callMutation.mutate({ targetUserId: friend.user!.id, mode: 'video' })}
                        data-testid="friend-row-video-button"
                        className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        disabled={callMutation.isPending}
                      >
                        {t('voice.videoCall')}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => blockMutation.mutate(friend.id)}
                    data-testid="friend-row-block-button"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  >
                    {t('friend.block')}
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(friend.id)}
                    data-testid="friend-row-remove-button"
                    className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-gray-600 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    {t('friend.remove')}
                  </button>
                </>
              )}
              {activeTab === 'blocked' && (
                <button
                  onClick={() => removeMutation.mutate(friend.id)}
                  data-testid="friend-row-unblock-button"
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                >
                  {t('friend.unblock')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
