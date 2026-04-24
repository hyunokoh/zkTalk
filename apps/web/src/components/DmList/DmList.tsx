'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTranslation, t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { useDmStore } from '@/stores/dm';
import { UserAvatar } from '@/components/UserAvatar';
import { NewDmModal } from '@/components/NewDmModal';
import { subscribe } from '@/hooks/useWebSocket';
import { WebSocketEvent } from '@zktalk/shared';

interface DmParticipant {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
}

interface ConversationRow {
  conversation: {
    id: string;
    type: 'direct' | 'group';
    name: string | null;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
  };
  participants: DmParticipant[];
  latestMessage: {
    message: {
      id: string;
      bodyMarkdown: string;
      createdAt: string;
      authorUserId: string;
    };
    author: {
      displayName: string;
    };
  } | null;
  unreadCount: number;
  promotedCommunity?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  promotedChannel?: {
    id: string;
    name: string;
  } | null;
}

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr).getTime();
  if (isNaN(date)) return '';
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  return t('time.daysAgo', { count: days });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

interface DmListProps {
  onConversationSelect?: () => void;
}

export function DmList({ onConversationSelect }: DmListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const activeId = params.conversationId as string | undefined;
  const currentUser = useAuthStore((s) => s.user);
  const setActiveConversation = useDmStore((s) => s.setActiveConversation);
  const [showNewDm, setShowNewDm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const res = await api<{ conversations: ConversationRow[] }>('/api/dm/conversations');
      return res.conversations;
    },
  });

  const conversations = data ?? [];

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
    };

    const unsubscribers = [
      subscribe(WebSocketEvent.DM_MESSAGE_CREATED, invalidate),
      subscribe(WebSocketEvent.DM_MESSAGE_UPDATED, invalidate),
      subscribe(WebSocketEvent.DM_MESSAGE_DELETED, invalidate),
      subscribe(WebSocketEvent.DM_CONVERSATION_CREATED, invalidate),
      subscribe(WebSocketEvent.DM_CONVERSATION_UPDATED, invalidate),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [queryClient]);

  function getDisplayName(row: ConversationRow): string {
    const conv = row.conversation;
    const isGroup = conv.type === 'group';
    if (isGroup && conv.name) return conv.name;
    if (isGroup) {
      return row.participants
        .filter((p) => p.userId !== currentUser?.id)
        .map((p) => p.user.displayName)
        .join(', ');
    }
    const other = row.participants.find((p) => p.userId !== currentUser?.id);
    return other?.user.displayName ?? '?';
  }

  function getAvatar(row: ConversationRow) {
    const isGroup = row.conversation.type === 'group';
    if (isGroup) {
      const name = row.conversation.name || 'G';
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-agent text-sm font-medium text-white">
          {name.charAt(0).toUpperCase()}
        </div>
      );
    }
    const other = row.participants.find((p) => p.userId !== currentUser?.id);
    if (other) {
      return (
        <UserAvatar
          displayName={other.user.displayName}
          avatarUrl={other.user.avatarUrl}
          size="md"
        />
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-sm font-medium text-fg">
        ?
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-line bg-bg-subtle" data-testid="dm-list">
      <div className="border-b border-line px-4 py-3 pl-12 md:pl-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg">
              {t('dm.title')}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {t('dm.listSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowNewDm(true)}
            title={t('dm.new')}
            data-testid="dm-list-new-button"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-accent px-3 text-xs font-semibold text-[color:var(--on-accent)] transition hover:bg-accent-strong"
          >
            {t('dm.new')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-8 text-center text-sm text-fg-subtle">
            {t('common.loading')}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-fg-subtle">
            {t('dm.noConversations')}
          </div>
        )}

        {conversations.map((row) => {
          const conv = row.conversation;
          const isActive = activeId === conv.id;
          const displayName = getDisplayName(row);
          const promotedTarget =
            row.promotedCommunity && row.promotedChannel
              ? {
                  community: row.promotedCommunity,
                  channel: row.promotedChannel,
                }
              : null;
          const lastPreview = row.latestMessage
            ? truncate(row.latestMessage.message.bodyMarkdown, 40)
            : '';
          const timeAgo = row.latestMessage
            ? getTimeAgo(row.latestMessage.message.createdAt)
            : getTimeAgo(conv.updatedAt);
          const destinationHref = promotedTarget
            ? `/communities/${promotedTarget.community.slug}/channels/${promotedTarget.channel.id}`
            : `/dm/${conv.id}`;
          const historyHref = `/dm/${conv.id}`;
          const hasHistory = Boolean(lastPreview) || row.unreadCount > 0;

          return (
            <div
              key={conv.id}
              className={`px-3 py-2.5 transition-colors ${
                isActive
                  ? 'bg-bg-hover'
                  : 'hover:bg-bg-hover'
              }`}
              data-testid="dm-list-row"
              data-conversation-id={conv.id}
              data-promoted={promotedTarget ? 'true' : 'false'}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveConversation(promotedTarget ? null : conv.id);
                    router.push(destinationHref);
                    onConversationSelect?.();
                  }}
                  data-testid="dm-list-row-main-button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {getAvatar(row)}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-fg">
                          {displayName}
                        </span>
                        {promotedTarget && (
                          <span className="shrink-0 rounded-full border border-warning bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                            {t('dm.promotedListBadge')}
                          </span>
                        )}
                      </div>
                      <span className="text-right text-[11px] text-fg-subtle">
                        {timeAgo}
                      </span>
                    </div>
                    {(lastPreview || promotedTarget) && (
                      <p className="truncate text-xs text-fg-muted">
                        {lastPreview
                          ? (promotedTarget
                              ? `${t('dm.historyBadge')} · ${lastPreview}`
                              : lastPreview)
                          : t('dm.promotedNoHistoryPreview')}
                      </p>
                    )}
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {row.unreadCount > 0 && !promotedTarget && (
                        <span className="inline-block rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--on-accent)]">
                          {row.unreadCount}
                        </span>
                      )}
                      {promotedTarget && (
                        <span className="truncate text-[11px] text-warning">
                          {promotedTarget.community.name} · #{promotedTarget.channel.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {promotedTarget && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {hasHistory && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConversation(conv.id);
                          router.push(historyHref);
                          onConversationSelect?.();
                        }}
                        data-testid="dm-list-view-history-button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-hover px-2.5 py-1 text-[11px] font-semibold text-fg transition-colors"
                      >
                        {t('dm.viewHistory')}
                        {row.unreadCount > 0 && (
                          <span className="inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-semibold text-[color:var(--on-accent)]">
                            {row.unreadCount}
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConversation(null);
                        router.push(
                          `/communities/${promotedTarget.community.slug}/channels/${promotedTarget.channel.id}`,
                        );
                        onConversationSelect?.();
                      }}
                      data-testid="dm-list-open-channel-button"
                      className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning transition-colors hover:bg-warning/20"
                    >
                      {t('dm.openChannel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNewDm && <NewDmModal onClose={() => setShowNewDm(false)} />}
    </div>
  );
}
