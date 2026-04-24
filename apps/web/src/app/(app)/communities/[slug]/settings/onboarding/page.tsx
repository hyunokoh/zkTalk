'use client';

import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import {
  canUseChannelAsOnboardingStarter,
  getChannelAccessSummaryKey,
} from '@zktalk/shared';
import type { ChannelAccessPolicy, Community } from '@zktalk/shared';

interface OnboardingConfig {
  id?: string;
  communityId?: string;
  welcomeMessage: string | null;
  rules: string | null;
  defaultChannelIds: string | null;
  isEnabled: boolean;
}

interface CommunityChannel {
  id: string;
  name: string;
  accessPolicy: ChannelAccessPolicy;
}

function getAccessPolicyBadgeClassName(accessPolicy: ChannelAccessPolicy) {
  if (accessPolicy === 'public') {
    return 'border-success bg-success-soft text-success dark:border-success/30 dark:bg-success/10 dark:text-success';
  }

  if (accessPolicy === 'invite_only') {
    return 'border-warning bg-warning text-warning dark:border-warning/30 dark:bg-warning/10 dark:text-warning';
  }

  return 'border-accent-soft bg-accent-soft text-accent-strong dark:border-accent/30 dark:bg-accent/10 dark:text-accent';
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function OnboardingSettingsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;

  // Get community
  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { canManageSettings, isLoading: roleLoading } = useCommunityRole(community?.id);

  // Get onboarding config
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding', community?.id],
    queryFn: () => api<{ onboarding: OnboardingConfig | null }>(`/api/communities/${community!.id}/onboarding`),
    enabled: !!community?.id && canManageSettings,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['community-channels', community?.id],
    queryFn: async () => {
      const res = await api<{
        uncategorized: CommunityChannel[];
        categories: Array<{ channels: CommunityChannel[] }>;
      }>(`/api/communities/${community!.id}/channels`);

      return [
        ...(res.uncategorized ?? []),
        ...(res.categories ?? []).flatMap((category) => category.channels ?? []),
      ];
    },
    enabled: !!community?.id && canManageSettings,
  });

  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [defaultChannelIds, setDefaultChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (onboardingData?.onboarding) {
      const ob = onboardingData.onboarding;
      setWelcomeMessage(ob.welcomeMessage ?? '');
      setRules(parseJsonArray(ob.rules));
      setDefaultChannelIds(parseJsonArray(ob.defaultChannelIds));
      setIsEnabled(ob.isEnabled);
    }
  }, [onboardingData]);

  const filteredChannels = useMemo(() => {
    const normalizedQuery = channelSearchQuery.trim().toLowerCase();
    const eligibleChannels = channels.filter((channel) =>
      canUseChannelAsOnboardingStarter(channel.accessPolicy),
    );

    if (!normalizedQuery) {
      return eligibleChannels;
    }

    return eligibleChannels.filter((channel) => channel.name.toLowerCase().includes(normalizedQuery));
  }, [channelSearchQuery, channels]);

  const saveMutation = useMutation({
    mutationFn: (data: {
      welcomeMessage?: string;
      rules?: string[];
      defaultChannelIds?: string[];
      isEnabled?: boolean;
    }) =>
      api(`/api/communities/${community!.id}/onboarding`, {
        method: 'PUT',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding', community?.id] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      welcomeMessage,
      rules,
      defaultChannelIds,
      isEnabled,
    });
  };

  const addRule = () => {
    if (newRule.trim()) {
      setRules([...rules, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  if (!community || roleLoading) {
    return <div className="p-8 text-center text-fg-muted">{t('common.loading')}</div>;
  }

  if (!canManageSettings) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-fg-muted">
        <svg className="h-12 w-12 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0a2 2 0 100-4 2 2 0 000 4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <p className="text-sm">{t('settings.notAdmin')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-fg-muted hover:text-fg dark:text-fg-muted dark:hover:text-fg-muted"
      >
        {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold text-fg dark:text-fg-muted">
        {t('onboarding.settings')}
      </h1>

      <div className="mt-6 space-y-6">
        {/* Enable toggle */}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="rounded border-line text-accent-strong focus:ring-accent"
          />
          <span className="text-sm font-medium text-fg dark:text-fg-muted">
            {t('onboarding.settings')}
          </span>
        </label>

        {/* Welcome message */}
        <div>
          <label className="block text-sm font-medium text-fg dark:text-fg-muted">
            {t('onboarding.welcome')}
          </label>
          <textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
          />
        </div>

        {/* Rules */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-fg dark:text-fg-muted">
              {t('onboarding.rules')}
            </label>
            <span className="text-xs text-fg-muted dark:text-fg-muted">
              {t('community.onboardingRulesCount', { count: rules.length })}
            </span>
          </div>
          <div className="mt-2 space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm dark:border-line dark:text-fg-muted">
                  {i + 1}. {rule}
                </span>
                <button
                  onClick={() => removeRule(i)}
                  className="text-danger hover:text-danger"
                >
                  {t('common.delete')}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
              placeholder={t('onboarding.rules')}
              className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
            />
            <button
              onClick={addRule}
              className="rounded-lg bg-bg-hover px-3 py-1.5 text-sm hover:bg-bg-hover dark:bg-bg-subtle dark:hover:bg-bg-hover"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="block text-sm font-medium text-fg dark:text-fg-muted">
              {t('community.onboardingDefaultChannels')}
            </label>
            <span className="text-xs text-fg-muted dark:text-fg-muted">
              {defaultChannelIds.length > 0 ? `${defaultChannelIds.length}` : ''}
            </span>
          </div>
          <p className="mt-1 text-sm text-fg-muted dark:text-fg-muted">
            {t('community.onboardingDefaultChannelsHint')}
          </p>
          <p className="mt-1 text-xs text-fg-muted dark:text-fg-muted">
            {t('community.onboardingDefaultChannelsPolicyHint')}
          </p>
          <input
            value={channelSearchQuery}
            onChange={(e) => setChannelSearchQuery(e.target.value)}
            placeholder={t('community.onboardingChannelSearchPlaceholder')}
            className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {filteredChannels.map((channel) => {
              const selected = defaultChannelIds.includes(channel.id);

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() =>
                    setDefaultChannelIds((prev) =>
                      prev.includes(channel.id)
                        ? prev.filter((id) => id !== channel.id)
                        : [...prev, channel.id],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    selected
                      ? 'border-accent bg-accent-soft text-accent-strong dark:border-accent dark:bg-accent/10 dark:text-accent'
                      : 'border-line text-fg hover:border-line dark:border-line dark:text-fg-muted dark:hover:border-line'
                  }`}
                >
                  <span># {channel.name}</span>
                  {getChannelAccessSummaryKey(channel.accessPolicy) ? (
                  <span
                    className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getAccessPolicyBadgeClassName(channel.accessPolicy)}`}
                  >
                    {t(getChannelAccessSummaryKey(channel.accessPolicy)!)}
                  </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {filteredChannels.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted dark:text-fg-muted">
              {channelSearchQuery.trim()
                ? t('community.onboardingChannelNoSearchResults')
                : t('community.onboardingNoChannels')}
            </p>
          ) : null}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
        >
          {saveMutation.isPending ? t('settings.saving') : t('common.save')}
        </button>

        {saveMutation.isSuccess && (
          <p className="text-sm text-success">{t('settings.saved')}</p>
        )}
      </div>
    </div>
  );
}
