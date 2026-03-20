'use client';

import Link from 'next/link';

export interface InboxItemData {
  id: string;
  type: 'mention' | 'thread_reply';
  channelName: string;
  communitySlug: string;
  channelId: string;
  messageId: string;
  threadId?: string;
  authorDisplayName: string;
  bodyPreview: string;
  createdAt: string;
  isRead: boolean;
}

interface InboxItemProps {
  item: InboxItemData;
  onMarkRead: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export function InboxItem({ item, onMarkRead }: InboxItemProps) {
  const href = item.threadId
    ? `/communities/${item.communitySlug}/${item.channelId}?thread=${item.threadId}#${item.messageId}`
    : `/communities/${item.communitySlug}/${item.channelId}#${item.messageId}`;

  return (
    <Link
      href={href}
      onClick={() => {
        if (!item.isRead) onMarkRead(item.id);
      }}
      className={`flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-gray-800/50 ${
        !item.isRead ? 'bg-gray-800/30' : ''
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800">
        {item.type === 'mention' ? (
          <span className="text-sm font-bold text-indigo-400">@</span>
        ) : (
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              !item.isRead ? 'font-semibold text-gray-200' : 'text-gray-400'
            }`}
          >
            {item.authorDisplayName}
          </span>
          <span className="text-xs text-gray-600">
            {item.type === 'mention' ? 'mentioned you in' : 'replied in'}
          </span>
          <span className="text-xs text-gray-500"># {item.channelName}</span>
        </div>
        <p
          className={`mt-0.5 line-clamp-1 text-sm ${
            !item.isRead ? 'text-gray-300' : 'text-gray-500'
          }`}
        >
          {item.bodyPreview}
        </p>
      </div>

      {/* Right side: time + unread dot */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-gray-600">
          {formatRelativeTime(item.createdAt)}
        </span>
        {!item.isRead && (
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
        )}
      </div>
    </Link>
  );
}
