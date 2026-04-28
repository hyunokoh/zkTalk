'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import {
  computeKeyFingerprint,
  computeSafetyNumber,
} from '@/lib/crypto-fingerprint';

interface DmSecurityPanelProps {
  open: boolean;
  onClose: () => void;
  otherUserId: string;
  otherDisplayName: string;
}

interface KeyResp {
  publicKey: string | null;
}

interface State {
  status: 'loading' | 'ready' | 'no-peer-key' | 'no-self-key' | 'error';
  safety?: string;
  myPrint?: string;
  theirPrint?: string;
  errorMessage?: string;
}

export function DmSecurityPanel({
  open,
  onClose,
  otherUserId,
  otherDisplayName,
}: DmSecurityPanelProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!open || !currentUserId) return;
    let cancelled = false;
    setState({ status: 'loading' });

    void (async () => {
      try {
        const [me, them] = await Promise.all([
          api<KeyResp>(`/api/users/${currentUserId}/keys`),
          api<KeyResp>(`/api/users/${otherUserId}/keys`),
        ]);
        if (cancelled) return;
        if (!me.publicKey) {
          setState({ status: 'no-self-key' });
          return;
        }
        if (!them.publicKey) {
          setState({ status: 'no-peer-key' });
          return;
        }
        const [safety, myPrint, theirPrint] = await Promise.all([
          computeSafetyNumber(me.publicKey, them.publicKey),
          computeKeyFingerprint(me.publicKey),
          computeKeyFingerprint(them.publicKey),
        ]);
        if (!cancelled) {
          setState({ status: 'ready', safety, myPrint, theirPrint });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: 'error',
            errorMessage: err instanceof Error ? err.message : 'unknown error',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, currentUserId, otherUserId]);

  if (!open) return null;

  const copySafety = async () => {
    if (!state.safety) return;
    try {
      await navigator.clipboard.writeText(state.safety);
      showToast({ tone: 'success', message: t('dmSecurity.copied') });
    } catch {
      showToast({ tone: 'error', message: 'Copy failed' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="dm-security-panel"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-bg-elevated p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-fg">
              {t('dmSecurity.title')}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {t('dmSecurity.subtitle', { name: otherDisplayName })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-bg-hover"
          >
            {t('common.cancel')}
          </button>
        </header>

        {state.status === 'loading' ? (
          <p className="text-sm text-fg-muted">{t('common.loading')}</p>
        ) : state.status === 'no-self-key' ? (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {t('dmSecurity.selfKeyMissing')}
          </p>
        ) : state.status === 'no-peer-key' ? (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            {t('dmSecurity.peerKeyMissing', { name: otherDisplayName })}
          </p>
        ) : state.status === 'error' ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.errorMessage}
          </p>
        ) : state.status === 'ready' && state.safety ? (
          <>
            {/* Joint safety number — same value on both sides if no MITM */}
            <section
              className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-4"
              data-testid="dm-security-safety-number"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
                {t('dmSecurity.safetyNumberLabel')}
              </p>
              <code className="mt-2 block break-all font-mono text-base leading-6 text-fg">
                {state.safety}
              </code>
              <button
                onClick={() => void copySafety()}
                className="mt-2 rounded-md bg-accent px-3 py-1 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong"
              >
                {t('dmSecurity.copy')}
              </button>
            </section>

            <p className="text-xs leading-5 text-fg-muted">
              {t('dmSecurity.howTo')}
            </p>

            {/* Per-key fingerprints, less critical but useful for record */}
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-line bg-bg-subtle px-3 py-2">
                <p className="text-[11px] font-semibold text-fg-muted">
                  {t('dmSecurity.myKey')}
                </p>
                <code className="mt-1 block break-all font-mono text-[11px] text-fg">
                  {state.myPrint}
                </code>
              </div>
              <div className="rounded-md border border-line bg-bg-subtle px-3 py-2">
                <p className="text-[11px] font-semibold text-fg-muted">
                  {t('dmSecurity.theirKey', { name: otherDisplayName })}
                </p>
                <code className="mt-1 block break-all font-mono text-[11px] text-fg">
                  {state.theirPrint}
                </code>
              </div>
            </section>

            <p className="text-[11px] leading-4 text-fg-subtle">
              {t('dmSecurity.disclaimer')}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
