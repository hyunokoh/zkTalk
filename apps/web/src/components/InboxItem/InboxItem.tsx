'use client';

import { useRouter } from 'next/navigation';
import { useTranslation, t } from '@/lib/i18n';

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
  onMarkRead: (messageId: string) => Promise<void>;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

export function InboxItem({ item, onMarkRead }: InboxItemProps) {
  const router = useRouter();
  const { t: translate } = useTranslation();
  const href = item.threadId
    ? `/communities/${item.communitySlug}/channels/${item.channelId}/threads/${item.threadId}#${item.messageId}`
    : `/communities/${item.communitySlug}/channels/${item.channelId}#${item.messageId}`;

  return (
    <button
      type="button"
      data-testid="inbox-item"
      data-inbox-type={item.type}
      data-message-id={item.messageId}
      onClick={async () => {
        if (!item.isRead) {
          await onMarkRead(item.messageId);
        }
        router.push(href);
      }}
      className={`flex items-start gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-bg-subtle/50 ${
        !item.isRead ? 'bg-bg-subtle/30' : ''
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle">
        {item.type === 'mention' ? (
          <span className="text-sm font-bold text-accent">@</span>
        ) : (
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${
              !item.isRead ? 'font-semibold text-fg-muted' : 'text-fg-muted'
            }`}
          >
            {item.authorDisplayName}
          </span>
          <span className="text-xs text-fg">
            {item.type === 'mention' ? translate('inbox.mentionedYou') : translate('inbox.repliedIn')}
          </span>
          <span className="text-xs text-fg-muted"># {item.channelName}</span>
        </div>
        <p
          className={`mt-0.5 line-clamp-1 text-sm ${
            !item.isRead ? 'text-fg-muted' : 'text-fg-muted'
          }`}
        >
          {item.bodyPreview}
        </p>
      </div>

      {/* Right side: time + unread dot */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-fg">
          {formatRelativeTime(item.createdAt)}
        </span>
        {!item.isRead && (
          <div className="h-2 w-2 rounded-full bg-accent" />
        )}
      </div>
    </button>
  );
}
