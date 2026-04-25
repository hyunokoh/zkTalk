'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKey,
  type IssuedApiKey,
} from '@/lib/api-keys';
import { useToastStore } from '@/stores/toast';

const DEFAULT_SCOPES = ['me:read', 'messages:read'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ApiKeysSettingsPage() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: listApiKeys,
  });

  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [issued, setIssued] = useState<IssuedApiKey | null>(null);

  const createMut = useMutation({
    mutationFn: () => createApiKey({ name, scopes: selectedScopes }),
    onSuccess: (key) => {
      setIssued(key);
      setName('');
      setSelectedScopes(DEFAULT_SCOPES);
      qc.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (err) => {
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to create API key',
      });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (keyId: string) => revokeApiKey(keyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] });
      showToast({ tone: 'success', message: t('apiKeys.toastRevoked') });
    },
    onError: (err) => {
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to revoke key',
      });
    },
  });

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      showToast({ tone: 'success', message: t('apiKeys.toastCopied') });
    } catch {
      showToast({ tone: 'error', message: 'Copy failed' });
    }
  };

  const availableScopes = data?.availableScopes ?? DEFAULT_SCOPES;
  const activeKeys = (data?.keys ?? []).filter((k) => !k.revokedAt);

  return (
    <div className="flex-1 overflow-y-auto" data-testid="api-keys-page">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold text-fg">{t('apiKeys.title')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{t('apiKeys.help')}</p>

        {/* Just-issued key (shown once) */}
        {issued ? (
          <div
            className="mt-6 rounded-[1.25rem] border border-accent/40 bg-accent-soft/30 p-5"
            data-testid="api-keys-issued"
          >
            <p className="text-sm font-semibold text-fg">
              {t('apiKeys.issuedTitle')}
            </p>
            <p className="mt-1 text-xs text-fg-muted">{t('apiKeys.issuedHint')}</p>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm">
              <code className="grow truncate" data-testid="api-keys-issued-key">
                {issued.plaintextKey}
              </code>
              <button
                onClick={() => void copyKey(issued.plaintextKey)}
                className="shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-[color:var(--on-accent)] hover:bg-accent-strong"
              >
                {t('apiKeys.copy')}
              </button>
            </div>
            <button
              onClick={() => setIssued(null)}
              className="mt-3 text-xs text-fg-muted underline hover:text-fg"
            >
              {t('apiKeys.dismiss')}
            </button>
          </div>
        ) : null}

        {/* Create new key form */}
        <section className="mt-6 rounded-[1.25rem] border border-line bg-bg-elevated/50 p-5">
          <h2 className="text-base font-semibold text-fg">{t('apiKeys.newKey')}</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-fg-muted">
                {t('apiKeys.nameLabel')}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('apiKeys.namePlaceholder')}
                className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                data-testid="api-keys-name"
              />
            </label>

            <div>
              <p className="text-xs font-medium text-fg-muted">
                {t('apiKeys.scopesLabel')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableScopes.map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      selectedScopes.includes(scope)
                        ? 'border-accent bg-accent text-[color:var(--on-accent)]'
                        : 'border-line bg-bg text-fg-muted hover:border-accent'
                    }`}
                    data-testid={`api-keys-scope-${scope}`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => createMut.mutate()}
              disabled={!name.trim() || selectedScopes.length === 0 || createMut.isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
              data-testid="api-keys-create"
            >
              {createMut.isPending ? t('apiKeys.creating') : t('apiKeys.create')}
            </button>
          </div>
        </section>

        {/* Active keys list */}
        <section className="mt-6 rounded-[1.25rem] border border-line bg-bg-elevated/50 p-5">
          <h2 className="text-base font-semibold text-fg">
            {t('apiKeys.activeKeys')}
          </h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-fg-muted">{t('common.loading')}</p>
          ) : activeKeys.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">{t('apiKeys.noKeys')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeKeys.map((key: ApiKey) => (
                <li
                  key={key.id}
                  className="rounded-md border border-line bg-bg px-3 py-3"
                  data-testid={`api-keys-row-${key.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-fg">{key.name}</p>
                      <p className="truncate font-mono text-xs text-fg-muted">
                        {key.keyPrefix}…
                      </p>
                      <p className="mt-1 text-xs text-fg-muted">
                        {key.scopes.join(', ')}
                      </p>
                      <p className="mt-1 text-xs text-fg-subtle">
                        {t('apiKeys.lastUsed')}: {formatDate(key.lastUsedAt)} ·{' '}
                        {t('apiKeys.created')}: {formatDate(key.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => revokeMut.mutate(key.id)}
                      disabled={revokeMut.isPending}
                      className="shrink-0 rounded-md border border-line px-3 py-1 text-xs font-medium text-fg-muted hover:border-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {t('apiKeys.revoke')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-4 text-xs text-fg-subtle">
          {t('apiKeys.docsHint')}{' '}
          <code className="rounded bg-bg-subtle px-1 py-0.5 font-mono">
            docs/public-api.md
          </code>
        </p>
      </div>
    </div>
  );
}
