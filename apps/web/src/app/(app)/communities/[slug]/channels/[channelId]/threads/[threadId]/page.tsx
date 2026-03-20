'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MessageList } from '@/components/MessageList';
import { MessageComposer } from '@/components/MessageComposer';
import type { Thread } from '@zktalk/shared';

export default function ThreadPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const threadId = params.threadId as string;

  const { data: thread } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api<Thread>(`/api/channels/${channelId}/threads/${threadId}`),
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      {thread && (
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-100">{thread.title ?? 'Thread'}</h2>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
            <span>{thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}</span>
            {thread.isLocked && <span className="text-amber-400">Locked</span>}
          </div>
        </div>
      )}

      <MessageList channelId={channelId} threadId={threadId} />

      {thread?.isLocked ? (
        <div className="border-t border-gray-800 px-4 py-3 text-center text-sm text-gray-500">
          This thread is locked. No new replies can be posted.
        </div>
      ) : (
        <MessageComposer
          channelId={channelId}
          threadId={threadId}
          placeholder="Reply to thread..."
        />
      )}
    </div>
  );
}
