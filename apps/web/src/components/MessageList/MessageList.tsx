'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageItem, type MessageReactionGroup } from '@/components/MessageItem';
import type { PollCardData } from '@/components/PollCard';
import { useChannel } from '@/hooks/useChannel';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useTranslation } from '@/lib/i18n';
import type { Attachment, Message, User } from '@zktalk/shared';

const REACTION_BATCH_SIZE = 100;
const POLL_BATCH_SIZE = 100;

interface MessageRow {
  message: Message;
  author: User;
  attachments?: Attachment[];
}

interface MessagesPage {
  messages: MessageRow[];
  hasMore: boolean;
  nextCursor?: string | null;
  /** KakaoTalk-style unread counts: messageId -> number of members who haven't read */
  unreadCounts?: Record<string, number>;
}

interface ThreadMessagesPage {
  items: MessageRow[];
  nextCursor: string | null;
}

interface TopicInfo {
  topic: string | null;
  latestMessageAt: string;
  messageCount: number;
}

interface ReactionApiGroup {
  emoji: string;
  count: number;
  userIds?: string[];
  users?: Array<{ id: string }>;
}

function normalizeReactionGroups(
  groups: ReactionApiGroup[] | undefined,
): MessageReactionGroup[] {
  return (groups ?? []).map((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count,
    userIds: reaction.userIds ?? reaction.users?.map((user) => user.id) ?? [],
  }));
}

interface MessageListProps {
  channelId: string;
  threadId?: string | null;
  communityId?: string;
  onReplyToMessage?: (message: Message, author?: User | null) => void;
  /** Whether channel uses topic-based threading */
  requireTopic?: boolean;
  /** Currently selected topic filter */
  topicFilter?: string;
  /** Callback when user selects a topic */
  onTopicSelect?: (topic: string | null) => void;
}

export function MessageList({ channelId, threadId, communityId, onReplyToMessage, requireTopic, topicFilter, onTopicSelect }: MessageListProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Subscribe to real-time WebSocket events for this channel
  useChannel(channelId);

  // Typing indicator state
  const { typingUsers } = useTypingIndicator(channelId);

  const basePath = threadId
    ? `/api/channels/${channelId}/threads/${threadId}/messages`
    : `/api/channels/${channelId}/messages`;

  // Fetch topics list for topic-based channels
  const { data: topicsData } = useQuery({
    queryKey: ['channel-topics', channelId],
    queryFn: async () => {
      const res = await api<{ topics: TopicInfo[] }>(
        `/api/channels/${channelId}/topics`,
      );
      return res.topics ?? [];
    },
    enabled: !!requireTopic,
    staleTime: 30_000,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', channelId, threadId ?? 'main', topicFilter ?? ''],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);
      if (topicFilter) params.set('topic', topicFilter);
      const response = await api<MessagesPage | ThreadMessagesPage>(`${basePath}?${params.toString()}`);

      if ('messages' in response) {
        return response;
      }

      return {
        messages: response.items,
        hasMore: !!response.nextCursor,
        nextCursor: response.nextCursor,
      } satisfies MessagesPage;
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].message.id;
    },
    refetchInterval: 30_000, // WS handles real-time; polling is fallback
  });

  // Flatten and deduplicate message rows across all pages.
  const allRows = useMemo(() => {
    const seen = new Set<string>();
    const rows = data?.pages.flatMap((p) => p.messages).reverse() ?? [];
    return rows.filter((row) => {
      if (seen.has(row.message.id)) {
        return false;
      }
      seen.add(row.message.id);
      return true;
    });
  }, [data?.pages]);
  const allMessages = allRows.map((row) => row.message);
  const messageIds = useMemo(
    () => allRows.map((row) => row.message.id),
    [allRows],
  );
  const messageIdsKey = useMemo(
    () => messageIds.join(','),
    [messageIds],
  );
  const attachmentsByMessageId = useMemo(() => {
    const map: Record<string, Attachment[]> = {};
    for (const row of allRows) {
      map[row.message.id] = row.attachments ?? [];
    }
    return map;
  }, [allRows]);

  const { data: reactionsByMessageId = {} } = useQuery({
    queryKey: ['channel-reactions', channelId, threadId ?? 'main', topicFilter ?? '', messageIdsKey],
    queryFn: async () => {
      const allReactions: Record<string, MessageReactionGroup[]> = {};

      for (let index = 0; index < messageIds.length; index += REACTION_BATCH_SIZE) {
        const batchIds = messageIds.slice(index, index + REACTION_BATCH_SIZE);
        const params = new URLSearchParams({
          messageIds: batchIds.join(','),
        });
        const response = await api<{
          reactionsByMessageId?: Record<string, ReactionApiGroup[]>;
        }>(`/api/reactions?${params.toString()}`);

        for (const [messageId, groups] of Object.entries(response.reactionsByMessageId ?? {})) {
          allReactions[messageId] = normalizeReactionGroups(groups);
        }
      }

      return allReactions;
    },
    enabled: messageIds.length > 0,
    staleTime: 30_000,
  });

  const { data: pollsByMessageId = {} } = useQuery({
    queryKey: ['channel-polls-by-message', channelId, threadId ?? 'main', messageIdsKey],
    queryFn: async () => {
      const allPolls: Record<string, PollCardData> = {};

      for (let index = 0; index < messageIds.length; index += POLL_BATCH_SIZE) {
        const batchIds = messageIds.slice(index, index + POLL_BATCH_SIZE);
        const params = new URLSearchParams({
          messageIds: batchIds.join(','),
        });
        const response = await api<{
          pollsByMessageId?: Record<string, PollCardData>;
        }>(`/api/polls?${params.toString()}`);

        Object.assign(allPolls, response.pollsByMessageId ?? {});
      }

      return allPolls;
    },
    enabled: messageIds.length > 0,
    staleTime: 30_000,
  });

  // Merge unread counts from all pages
  const unreadCounts: Record<string, number> = {};
  for (const page of data?.pages ?? []) {
    if (page.unreadCounts) {
      Object.assign(unreadCounts, page.unreadCounts);
    }
  }

  // Collect user map from message authors
  const userMap: Record<string, User> = {};
  for (const row of allRows) {
    if (row.author) {
      userMap[row.author.id] = row.author;
    }
  }

  // Build typing display text
  const typingText = (() => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map((uid) => {
      const author = userMap[uid];
      return author?.displayName ?? 'Someone';
    });
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  })();

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessages(false);

    // Load more when scrolled to top
    if (container.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-scroll to bottom on initial load and new messages
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    } else if (allMessages.length > 0) {
      setHasNewMessages(true);
    }
  }, [allMessages.length, isAtBottom]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [isLoading]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessages(false);
  }, []);

  // Group messages by topic for display
  const groupedByTopic = useMemo(() => {
    if (!requireTopic || topicFilter) return null; // Don't group when filtered to a single topic
    const groups: { topic: string; messages: Message[] }[] = [];
    let currentTopic = '';
    for (const msg of allMessages) {
      const msgTopic = (msg as Message & { topic?: string | null }).topic ?? '(no topic)';
      if (msgTopic !== currentTopic) {
        currentTopic = msgTopic;
        groups.push({ topic: msgTopic, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [allMessages, requireTopic, topicFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-transparent px-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-medium text-white/68 shadow-[0_22px_56px_rgba(2,8,23,0.34)] backdrop-blur-xl">
          {t('message.loading')}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-transparent">
      {/* Topic filter bar */}
      {requireTopic && topicsData && topicsData.length > 0 && (
        <div className="border-b border-white/8 bg-white/[0.02] px-5 py-3 md:px-8">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 overflow-x-auto">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/42">{t('topic.filter')}</span>
          <button
            onClick={() => onTopicSelect?.(null)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
              !topicFilter
                ? 'border-sky-300/30 bg-sky-300/14 text-sky-100'
                : 'border-white/8 bg-white/[0.04] text-white/56 hover:bg-white/[0.08] hover:text-white'
            }`}
          >
            {t('topic.all')}
          </button>
          {topicsData.map((topicItem) => (
            <button
              key={topicItem.topic}
              onClick={() => onTopicSelect?.(topicItem.topic)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                topicFilter === topicItem.topic
                  ? 'border-sky-300/30 bg-sky-300/14 text-sky-100'
                  : 'border-white/8 bg-white/[0.04] text-white/56 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {topicItem.topic} ({topicItem.messageCount})
            </button>
          ))}
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 md:px-8"
      >
        <div className="mx-auto w-full max-w-5xl">
        {/* Load more indicator */}
        {isFetchingNextPage && (
          <div className="py-4 text-center text-xs font-medium text-white/42">{t('message.loadingOlder')}</div>
        )}
        {hasNextPage && !isFetchingNextPage && (
          <div className="py-4 text-center">
            <button
              onClick={() => fetchNextPage()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/72 transition hover:bg-white/[0.08] hover:text-white"
            >
              {t('message.loadMore')}
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="py-5">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-white/[0.03] px-8 py-16 text-white/44 shadow-[0_24px_60px_rgba(2,8,23,0.18)]">
              <svg className="mb-4 h-12 w-12 text-white/24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
              </svg>
              <p className="text-sm font-medium text-white/70">{t('message.noMessages')}</p>
            </div>
          ) : groupedByTopic ? (
            // Render grouped by topic (Zulip-style)
            groupedByTopic.map((group) => (
              <div key={group.topic}>
                <div className="sticky top-3 z-10 mx-auto mb-3 flex w-fit max-w-full items-center gap-2 rounded-full border border-white/8 bg-[#0f1a2b]/88 px-4 py-2 text-white/44 shadow-[0_16px_34px_rgba(2,8,23,0.28)] backdrop-blur-xl">
                  <svg className="h-3.5 w-3.5 text-white/40" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.243a1 1 0 11-1.94-.486L10.47 14H7.53l-.56 2.243a1 1 0 11-1.94-.486L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clipRule="evenodd" />
                  </svg>
                  <button
                    onClick={() => onTopicSelect?.(group.topic === '(no topic)' ? null : group.topic)}
                    className="truncate text-xs font-medium text-white/78 hover:text-white"
                  >
                    {group.topic}
                  </button>
                  <span className="text-[10px] text-white/36">
                    ({group.messages.length})
                  </span>
                </div>
                {group.messages.map((msg, groupIndex) => {
                  const previousMessage = groupIndex > 0 ? group.messages[groupIndex - 1] : undefined;
                  return (
                  <MessageItem
                    key={msg.id}
                    message={msg}
                    author={userMap[msg.authorUserId] ?? null}
                    channelId={channelId}
                    communityId={communityId}
                    onReply={onReplyToMessage}
                    allMessages={allMessages}
                    userMap={userMap}
                    unreadCount={unreadCounts[msg.id]}
                    attachments={attachmentsByMessageId[msg.id] ?? []}
                    reactions={reactionsByMessageId[msg.id] ?? []}
                    poll={pollsByMessageId[msg.id] ?? null}
                    startsGroup={previousMessage?.authorUserId !== msg.authorUserId}
                  />
                  );
                })}
              </div>
            ))
          ) : (
            allMessages.map((msg, index) => (
              <MessageItem
                key={msg.id}
                message={msg}
                author={userMap[msg.authorUserId] ?? null}
                channelId={channelId}
                communityId={communityId}
                onReply={onReplyToMessage}
                allMessages={allMessages}
                userMap={userMap}
                unreadCount={unreadCounts[msg.id]}
                attachments={attachmentsByMessageId[msg.id] ?? []}
                reactions={reactionsByMessageId[msg.id] ?? []}
                poll={pollsByMessageId[msg.id] ?? null}
                startsGroup={index === 0 || allMessages[index - 1].authorUserId !== msg.authorUserId}
              />
            ))
          )}
        </div>

        <div ref={bottomRef} />
        </div>
      </div>

      {/* Typing indicator */}
      {typingText && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-full border border-white/10 bg-[#0f1a2b]/86 px-4 py-2 text-xs font-medium text-white/72 shadow-[0_16px_36px_rgba(2,8,23,0.32)] backdrop-blur-xl">
            {typingText}
          </div>
        </div>
      )}

      {/* New messages indicator */}
      {hasNewMessages && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full border border-sky-300/30 bg-[linear-gradient(180deg,rgba(70,108,255,0.95),rgba(54,84,205,0.95))] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_42px_rgba(41,56,161,0.35)] hover:brightness-105"
        >
          {t('message.newMessages')} &darr;
        </button>
      )}
    </div>
  );
}
