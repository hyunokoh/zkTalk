'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageItem } from '@/components/MessageItem';
import type { Message, User } from '@zktalk/shared';

interface MessagesPage {
  messages: Message[];
  nextCursor: string | null;
  users?: Record<string, User>;
}

interface MessageListProps {
  channelId: string;
  threadId?: string | null;
}

export function MessageList({ channelId, threadId }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const basePath = threadId
    ? `/api/channels/${channelId}/threads/${threadId}/messages`
    : `/api/channels/${channelId}/messages`;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['messages', channelId, threadId ?? 'main'],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '50' });
      if (pageParam) params.set('cursor', pageParam);
      return api<MessagesPage>(`${basePath}?${params.toString()}`);
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: 5000, // Poll for new messages
  });

  // Flatten messages across all pages (pages are in reverse order; oldest first when combined)
  const allMessages = data?.pages.flatMap((p) => p.messages).reverse() ?? [];

  // Collect user map from all pages
  const userMap: Record<string, User> = {};
  if (data?.pages) {
    for (const page of data.pages) {
      if (page.users) {
        Object.assign(userMap, page.users);
      }
    }
  }

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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more indicator */}
        {isFetchingNextPage && (
          <div className="py-3 text-center text-xs text-gray-500">Loading older messages...</div>
        )}
        {hasNextPage && !isFetchingNextPage && (
          <div className="py-3 text-center">
            <button
              onClick={() => fetchNextPage()}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Load more
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="py-2">
          {allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg className="mb-3 h-12 w-12 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" />
              </svg>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            allMessages.map((msg) => (
              <MessageItem
                key={msg.id}
                message={msg}
                author={userMap[msg.authorUserId] ?? null}
                channelId={channelId}
              />
            ))
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* New messages indicator */}
      {hasNewMessages && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-indigo-500"
        >
          New messages &darr;
        </button>
      )}
    </div>
  );
}
