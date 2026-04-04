'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WebSocketEvent } from '@zktalk/shared';
import type { WSOutgoing } from '@zktalk/shared';
import { subscribe } from './useWebSocket';
import {
  showNotification,
  requestNotificationPermission,
  getNotificationPrefs,
} from '@/lib/notifications';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';

interface MessageData {
  bodyMarkdown?: string;
  authorDisplayName?: string;
  authorId?: string;
  mentions?: string[];
}

/**
 * Subscribes to WebSocket events and shows browser notifications
 * for new messages, DMs, and @mentions.
 */
export function useNotifications(): void {
  const router = useRouter();

  useEffect(() => {
    void requestNotificationPermission();

    // ── Channel messages ───────────────────────────────────────
    const unsubMessage = subscribe(WebSocketEvent.MESSAGE_CREATED, (msg: WSOutgoing) => {
      const prefs = getNotificationPrefs();
      if (!prefs.enabled) return;

      const currentUserId = useAuthStore.getState().user?.id;
      const data = msg.data as MessageData;

      // Don't notify for own messages
      if (data.authorId && data.authorId === currentUserId) return;

      const channelId = msg.channelId ?? '';
      const senderName = data.authorDisplayName ?? t('misc.unknownUser');
      const preview = data.bodyMarkdown?.slice(0, 100) ?? '';

      // Check for @mention (high priority)
      const isMention = currentUserId && data.mentions?.includes(currentUserId);

      if (isMention && prefs.mention) {
        const title = t('notification.mentionFrom', { name: senderName });
        showNotification({
          title,
          body: preview,
          priority: 'high',
          onClick: () => {
            if (msg.communityId && channelId) {
              router.push(`/communities/${msg.communityId}/channels/${channelId}`);
            }
          },
        });
        return;
      }

      // Regular channel message (only when window not focused)
      const title = `${senderName} - #${channelId}`;
      showNotification({
        title,
        body: preview,
        onClick: () => {
          if (msg.communityId && channelId) {
            router.push(`/communities/${msg.communityId}/channels/${channelId}`);
          }
        },
      });
    });

    // ── DM messages ────────────────────────────────────────────
    const unsubDm = subscribe(WebSocketEvent.DM_MESSAGE_CREATED, (msg: WSOutgoing) => {
      const prefs = getNotificationPrefs();
      if (!prefs.enabled || !prefs.dm) return;

      const currentUserId = useAuthStore.getState().user?.id;
      const data = msg.data as MessageData;

      // Don't notify for own messages
      if (data.authorId && data.authorId === currentUserId) return;

      const senderName = data.authorDisplayName ?? t('misc.unknownUser');
      const preview = data.bodyMarkdown?.slice(0, 100) ?? '';
      const conversationId = msg.conversationId ?? '';

      const title = t('notification.dmFrom', { name: senderName });
      showNotification({
        title,
        body: preview,
        alwaysShow: true, // DMs always notify unless muted
        onClick: () => {
          if (conversationId) {
            router.push(`/dm/${conversationId}`);
          }
        },
      });
    });

    return () => {
      unsubMessage();
      unsubDm();
    };
  }, [router]);
}
