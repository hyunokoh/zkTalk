'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import type { Community } from '@zktalk/shared';

interface AutoModRule {
  id: string;
  communityId: string;
  name: string;
  type: 'keyword_filter' | 'spam_filter' | 'link_filter';
  config: Record<string, unknown>;
  isEnabled: boolean;
  action: 'block' | 'flag' | 'mute';
  createdAt: string;
}

type RuleType = 'keyword_filter' | 'spam_filter' | 'link_filter';
type RuleAction = 'block' | 'flag' | 'mute';

export default function AutoModPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingDeleteRuleId, setPendingDeleteRuleId] = useState<string | null>(null);

  // Form state for new rule
  const [showForm, setShowForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<RuleType>('keyword_filter');
  const [ruleAction, setRuleAction] = useState<RuleAction>('block');
  const [keywords, setKeywords] = useState('');
  const [maxMessages, setMaxMessages] = useState('5');
  const [windowSeconds, setWindowSeconds] = useState('10');
  const [blockLinks, setBlockLinks] = useState(true);

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const communityId = community?.id;
  const { canManageModeration, isLoading: roleLoading } = useCommunityRole(communityId);

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ['automod-rules', communityId],
    queryFn: async () => {
      const res = await api<{ rules: AutoModRule[] }>(
        `/api/communities/${communityId}/automod/rules`,
      );
      return res.rules;
    },
    enabled: !!communityId && canManageModeration,
  });

  const rules = rulesData ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      let config: Record<string, unknown> = {};
      if (ruleType === 'keyword_filter') {
        config = { keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean) };
      } else if (ruleType === 'spam_filter') {
        config = { maxMessages: Number(maxMessages), windowSeconds: Number(windowSeconds) };
      } else if (ruleType === 'link_filter') {
        config = { blockLinks };
      }

      return api(`/api/communities/${communityId}/automod/rules`, {
        method: 'POST',
        body: { name: ruleName, type: ruleType, action: ruleAction, config },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod-rules', communityId] });
      setShowForm(false);
      setRuleName('');
      setKeywords('');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ ruleId, isEnabled }: { ruleId: string; isEnabled: boolean }) =>
      api(`/api/automod/rules/${ruleId}`, {
        method: 'PATCH',
        body: { isEnabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod-rules', communityId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) =>
      api(`/api/automod/rules/${ruleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automod-rules', communityId] });
    },
  });

  const ruleTypeLabel = (type: RuleType) => {
    switch (type) {
      case 'keyword_filter': return t('automod.keywordFilter');
      case 'spam_filter': return t('automod.spamFilter');
      case 'link_filter': return t('automod.linkFilter');
    }
  };

  const actionLabel = (action: RuleAction) => {
    switch (action) {
      case 'block': return t('automod.action.block');
      case 'flag': return t('automod.action.flag');
      case 'mute': return t('automod.action.mute');
    }
  };

  if (!communityId || roleLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  if (!canManageModeration) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-fg-muted">
        <svg className="h-12 w-12 text-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0a2 2 0 100-4 2 2 0 000 4zm6-6V7a6 6 0 10-12 0v4m-2 0h16a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z" />
        </svg>
        <p className="text-sm">{t('mod.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg-muted">
          {t('automod.title')}
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong"
        >
          {t('automod.addRule')}
        </button>
      </div>

      {/* Create rule form */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-line bg-white p-4 dark:bg-bg-subtle">
          <h2 className="mb-4 text-lg font-semibold text-fg-muted">
            {t('automod.addRule')}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">
                Name
              </label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
                placeholder="Rule name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">
                Type
              </label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
              >
                <option value="keyword_filter">{t('automod.keywordFilter')}</option>
                <option value="spam_filter">{t('automod.spamFilter')}</option>
                <option value="link_filter">{t('automod.linkFilter')}</option>
              </select>
            </div>

            {/* Type-specific config */}
            {ruleType === 'keyword_filter' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-fg-muted">
                  Keywords (comma-separated)
                </label>
                <textarea
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
                  rows={3}
                  placeholder="bad, spam, unwanted"
                />
              </div>
            )}

            {ruleType === 'spam_filter' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg-muted">
                    Max messages
                  </label>
                  <input
                    type="number"
                    value={maxMessages}
                    onChange={(e) => setMaxMessages(e.target.value)}
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
                    min="1"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-fg-muted">
                    Window (seconds)
                  </label>
                  <input
                    type="number"
                    value={windowSeconds}
                    onChange={(e) => setWindowSeconds(e.target.value)}
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
                    min="1"
                  />
                </div>
              </div>
            )}

            {ruleType === 'link_filter' && (
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input
                  type="checkbox"
                  checked={blockLinks}
                  onChange={(e) => setBlockLinks(e.target.checked)}
                  className="rounded border-line"
                />
                Block all links
              </label>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-fg-muted">
                Action
              </label>
              <select
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value as RuleAction)}
                className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg dark:bg-bg-subtle"
              >
                <option value="block">{t('automod.action.block')}</option>
                <option value="flag">{t('automod.action.flag')}</option>
                <option value="mute">{t('automod.action.mute')}</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate()}
                disabled={!ruleName.trim() || createMutation.isPending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
              >
                {createMutation.isPending ? t('common.loading') : t('common.create')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-bg-subtle dark:hover:bg-bg-subtle"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules list */}
      {isLoading ? (
        <p className="text-fg-muted">{t('common.loading')}</p>
      ) : rules.length === 0 ? (
        <p className="text-fg-muted">No AutoMod rules configured.</p>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-line bg-white p-4 dark:bg-bg-subtle"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-fg-muted">
                    {rule.name}
                  </h3>
                  <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-fg-subtle">
                    {ruleTypeLabel(rule.type)}
                  </span>
                  <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-fg-subtle">
                    {actionLabel(rule.action)}
                  </span>
                </div>
                {rule.type === 'keyword_filter' && Array.isArray(rule.config.keywords) && (
                  <p className="mt-1 text-xs text-fg-muted">
                    Keywords: {(rule.config.keywords as string[]).join(', ')}
                  </p>
                )}
                {rule.type === 'spam_filter' && (
                  <p className="mt-1 text-xs text-fg-muted">
                    Max {String(rule.config.maxMessages)} msgs / {String(rule.config.windowSeconds)}s
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Toggle switch */}
                <button
                  onClick={() =>
                    toggleMutation.mutate({
                      ruleId: rule.id,
                      isEnabled: !rule.isEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.isEnabled ? 'bg-accent' : 'bg-bg-hover-subtle'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>

                {/* Delete button */}
                <button
                  onClick={() => setPendingDeleteRuleId(rule.id)}
                  className="rounded p-1 text-danger hover:bg-danger-soft dark:hover:bg-danger/20"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={pendingDeleteRuleId !== null}
        title={t('common.delete')}
        description="Delete this rule?"
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDeleteRuleId(null)}
        onConfirm={() => {
          if (!pendingDeleteRuleId) {
            return;
          }
          deleteMutation.mutate(pendingDeleteRuleId, {
            onSuccess: () => {
              setPendingDeleteRuleId(null);
            },
            onError: () => {
              setPendingDeleteRuleId(null);
            },
          });
        }}
      />
    </div>
  );
}
