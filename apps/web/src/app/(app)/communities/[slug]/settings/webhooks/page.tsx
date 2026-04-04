'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import type { Community, Channel, Webhook, BotUser } from '@zktalk/shared';

interface ChannelCollection {
  uncategorized: Channel[];
  categories: { channels: Channel[] }[];
}

const API_URL = getApiBaseUrl();

export default function WebhooksSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  // Webhook form state
  const [webhookName, setWebhookName] = useState('');
  const [webhookChannelId, setWebhookChannelId] = useState('');
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Bot form state
  const [botName, setBotName] = useState('');

  // Fetch community
  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { canManageSettings, isLoading: roleLoading } = useCommunityRole(community?.id);

  // Fetch channels
  const { data: channelsData } = useQuery({
    queryKey: ['channels', community?.id],
    queryFn: async () => {
      return api<ChannelCollection>(`/api/communities/${community!.id}/channels`);
    },
    enabled: !!community?.id && canManageSettings,
  });

  // Fetch webhooks
  const { data: webhooksData } = useQuery({
    queryKey: ['webhooks', community?.id],
    queryFn: async () => {
      const res = await api<{ webhooks: Webhook[] }>(`/api/communities/${community!.id}/webhooks`);
      return res.webhooks;
    },
    enabled: !!community?.id && canManageSettings,
  });

  // Fetch bots
  const { data: botsData } = useQuery({
    queryKey: ['bots', community?.id],
    queryFn: async () => {
      const res = await api<{ bots: BotUser[] }>(`/api/communities/${community!.id}/bots`);
      return res.bots;
    },
    enabled: !!community?.id && canManageSettings,
  });

  // Create webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      return api<{ webhook: Webhook }>(`/api/communities/${community!.id}/webhooks`, {
        method: 'POST',
        body: { name: webhookName, channelId: webhookChannelId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', community?.id] });
      setWebhookName('');
      setWebhookChannelId('');
      showToast('success', t('webhook.created'));
    },
    onError: () => {
      showToast('error', t('webhook.createError'));
    },
  });

  // Delete webhook mutation
  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      return api(`/api/webhooks/${webhookId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks', community?.id] });
      showToast('success', t('webhook.deleted'));
    },
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async () => {
      return api<{ bot: BotUser }>(`/api/communities/${community!.id}/bots`, {
        method: 'POST',
        body: { name: botName },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots', community?.id] });
      setBotName('');
      showToast('success', t('bot.created'));
    },
    onError: () => {
      showToast('error', t('bot.createError'));
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: string) => {
      return api(`/api/bots/${botId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots', community?.id] });
      showToast('success', t('bot.deleted'));
    },
  });

  async function handleCopyToken(token: string, id: string) {
    await navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  }

  if (communityLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('community.notFound')}
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('common.loading')}
      </div>
    );
  }

  if (!canManageSettings) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-gray-400">
        <svg className="h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0a2 2 0 100-4 2 2 0 000 4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <p className="text-sm">{t('settings.notAdmin')}</p>
      </div>
    );
  }

  const channels = [
    ...(channelsData?.uncategorized ?? []),
    ...(channelsData?.categories?.flatMap((category) => category.channels) ?? []),
  ];
  const webhooks = webhooksData ?? [];
  const bots = botsData ?? [];

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-green-800 text-green-100'
              : 'bg-red-800 text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-100">{t('webhook.title')}</h1>

      {/* ── Webhooks Section ────────────────────────────────────── */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-300">{t('webhook.create')}</h2>

        <div className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="webhook-name" className="block text-sm font-medium text-gray-400">
              {t('webhook.name')}
            </label>
            <input
              id="webhook-name"
              type="text"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder={t('webhook.namePlaceholder')}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Channel select */}
          <div>
            <label htmlFor="webhook-channel" className="block text-sm font-medium text-gray-400">
              {t('webhook.channel')}
            </label>
            <select
              id="webhook-channel"
              value={webhookChannelId}
              onChange={(e) => setWebhookChannelId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">{t('webhook.selectChannel')}</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => createWebhookMutation.mutate()}
            disabled={!webhookName.trim() || !webhookChannelId || createWebhookMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createWebhookMutation.isPending ? t('common.loading') : t('webhook.create')}
          </button>
        </div>

        {/* Existing webhooks list */}
        <div className="mt-6 space-y-3">
          {webhooks.length === 0 && (
            <p className="text-sm text-gray-500">{t('webhook.noWebhooks')}</p>
          )}
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">{wh.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      wh.isActive
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {wh.isActive ? t('webhook.active') : t('webhook.inactive')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('webhook.deleteConfirm'))) {
                      deleteWebhookMutation.mutate(wh.id);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t('common.delete')}
                </button>
              </div>

              {/* Token */}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">{t('webhook.token')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={wh.token}
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 font-mono text-xs text-gray-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyToken(wh.token, wh.id)}
                    className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-600"
                  >
                    {copiedTokenId === wh.id ? t('webhook.tokenCopied') : t('webhook.copyToken')}
                  </button>
                </div>
              </div>

              {/* Execute URL */}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">{t('webhook.executeUrl')}</p>
                <code className="block rounded bg-gray-900 px-3 py-1.5 font-mono text-xs text-gray-400 break-all">
                  POST {API_URL}/api/webhooks/{wh.token}/execute
                </code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="my-8 border-gray-700" />

      {/* ── Bots Section ────────────────────────────────────────── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-300">{t('bot.create')}</h2>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="bot-name" className="block text-sm font-medium text-gray-400">
              {t('bot.name')}
            </label>
            <input
              id="bot-name"
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder={t('bot.namePlaceholder')}
              className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => createBotMutation.mutate()}
            disabled={!botName.trim() || createBotMutation.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createBotMutation.isPending ? t('common.loading') : t('bot.create')}
          </button>
        </div>

        {/* Existing bots list */}
        <div className="mt-6 space-y-3">
          {bots.length === 0 && (
            <p className="text-sm text-gray-500">{t('bot.noBots')}</p>
          )}
          {bots.map((bot) => (
            <div
              key={bot.id}
              className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">{bot.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      bot.isActive
                        ? 'bg-green-900/50 text-green-400'
                        : 'bg-red-900/50 text-red-400'
                    }`}
                  >
                    {bot.isActive ? t('webhook.active') : t('webhook.inactive')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t('bot.deleteConfirm'))) {
                      deleteBotMutation.mutate(bot.id);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  {t('common.delete')}
                </button>
              </div>

              {/* Token */}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">{t('bot.token')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={bot.token}
                    className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-1.5 font-mono text-xs text-gray-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyToken(bot.token, bot.id)}
                    className="shrink-0 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-600"
                  >
                    {copiedTokenId === bot.id ? t('webhook.tokenCopied') : t('webhook.copyToken')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
