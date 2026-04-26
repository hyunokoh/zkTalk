'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useToastStore } from '@/stores/toast';

interface BridgeView {
  id: string;
  channelId: string;
  platform: 'telegram' | 'discord';
  externalLabel: string | null;
  enabled: boolean;
  inboundEnabled: boolean;
  webhookUrl: string | null;
  createdAt: string;
}

interface ChannelBridgesProps {
  channelId: string;
}

export function ChannelBridges({ channelId }: ChannelBridgesProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['channel-bridges', channelId],
    queryFn: () =>
      api<{ bridges: BridgeView[] }>(`/api/channels/${channelId}/bridges`),
  });

  const [adding, setAdding] = useState<'telegram' | 'discord' | null>(null);
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [dcWebhookUrl, setDcWebhookUrl] = useState('');

  const refetch = () => qc.invalidateQueries({ queryKey: ['channel-bridges', channelId] });

  const createTelegram = useMutation({
    mutationFn: () =>
      api<{ bridge: BridgeView }>(`/api/channels/${channelId}/bridges/telegram`, {
        method: 'POST',
        body: { botToken: tgBotToken.trim(), chatId: tgChatId.trim() },
      }),
    onSuccess: () => {
      showToast({ tone: 'success', message: t('bridges.toastCreated') });
      setTgBotToken('');
      setTgChatId('');
      setAdding(null);
      refetch();
    },
    onError: (err) =>
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : t('bridges.toastError'),
      }),
  });

  const createDiscord = useMutation({
    mutationFn: () =>
      api<{ bridge: BridgeView }>(`/api/channels/${channelId}/bridges/discord`, {
        method: 'POST',
        body: { webhookUrl: dcWebhookUrl.trim() },
      }),
    onSuccess: () => {
      showToast({ tone: 'success', message: t('bridges.toastCreated') });
      setDcWebhookUrl('');
      setAdding(null);
      refetch();
    },
    onError: (err) =>
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : t('bridges.toastError'),
      }),
  });

  const removeBridge = useMutation({
    mutationFn: (id: string) =>
      api(`/api/channels/${channelId}/bridges/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      showToast({ tone: 'success', message: t('bridges.toastRemoved') });
      refetch();
    },
  });

  const toggleBridge = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api(`/api/channels/${channelId}/bridges/${id}`, {
        method: 'PATCH',
        body: { enabled },
      }),
    onSuccess: refetch,
  });

  const bridges = data?.bridges ?? [];

  return (
    <div className="border-t border-line pt-4" data-testid="channel-bridges">
      <h3 className="text-sm font-semibold text-fg">{t('bridges.title')}</h3>
      <p className="mt-1 text-xs text-fg-muted">{t('bridges.help')}</p>

      {isLoading ? (
        <p className="mt-3 text-xs text-fg-muted">{t('common.loading')}</p>
      ) : bridges.length === 0 ? (
        <p className="mt-3 text-xs text-fg-muted">{t('bridges.empty')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {bridges.map((b) => (
            <li
              key={b.id}
              className="flex items-start justify-between gap-3 rounded-md border border-line bg-bg-subtle/50 px-3 py-2"
              data-testid={`channel-bridges-row-${b.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">
                  {b.platform === 'telegram' ? '✈️ Telegram' : '🎮 Discord'}
                  {b.externalLabel ? ` · ${b.externalLabel}` : ''}
                </p>
                <p className="text-[11px] text-fg-muted">
                  {b.platform === 'telegram'
                    ? b.inboundEnabled
                      ? t('bridges.tgBidirectional')
                      : t('bridges.tgOutboundOnly')
                    : t('bridges.dcOutboundOnly')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleBridge.mutate({ id: b.id, enabled: !b.enabled })}
                  className="rounded-md border border-line px-2 py-1 text-[11px] text-fg-muted hover:bg-bg-hover"
                >
                  {b.enabled ? t('bridges.disable') : t('bridges.enable')}
                </button>
                <button
                  type="button"
                  onClick={() => removeBridge.mutate(b.id)}
                  className="rounded-md border border-line px-2 py-1 text-[11px] text-fg-muted hover:border-warning hover:text-warning"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!adding ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setAdding('telegram')}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-hover"
            data-testid="channel-bridges-add-telegram"
          >
            + {t('bridges.addTelegram')}
          </button>
          <button
            type="button"
            onClick={() => setAdding('discord')}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-hover"
            data-testid="channel-bridges-add-discord"
          >
            + {t('bridges.addDiscord')}
          </button>
        </div>
      ) : adding === 'telegram' ? (
        <div className="mt-3 space-y-2 rounded-md border border-line bg-bg p-3">
          <p className="text-xs text-fg-muted">{t('bridges.telegramHint')}</p>
          <input
            value={tgBotToken}
            onChange={(e) => setTgBotToken(e.target.value)}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            className="w-full rounded-md border border-line bg-bg-subtle px-3 py-1.5 text-xs"
            data-testid="channel-bridges-tg-token"
          />
          <input
            value={tgChatId}
            onChange={(e) => setTgChatId(e.target.value)}
            placeholder="-1001234567890"
            className="w-full rounded-md border border-line bg-bg-subtle px-3 py-1.5 text-xs"
            data-testid="channel-bridges-tg-chatid"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(null)}
              className="rounded-md px-3 py-1.5 text-xs text-fg-muted hover:bg-bg-hover"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => createTelegram.mutate()}
              disabled={!tgBotToken.trim() || !tgChatId.trim() || createTelegram.isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
            >
              {createTelegram.isPending ? t('common.loading') : t('bridges.create')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 rounded-md border border-line bg-bg p-3">
          <p className="text-xs text-fg-muted">{t('bridges.discordHint')}</p>
          <input
            value={dcWebhookUrl}
            onChange={(e) => setDcWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/123/abc..."
            className="w-full rounded-md border border-line bg-bg-subtle px-3 py-1.5 text-xs"
            data-testid="channel-bridges-dc-url"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(null)}
              className="rounded-md px-3 py-1.5 text-xs text-fg-muted hover:bg-bg-hover"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => createDiscord.mutate()}
              disabled={!dcWebhookUrl.trim() || createDiscord.isPending}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
            >
              {createDiscord.isPending ? t('common.loading') : t('bridges.create')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
