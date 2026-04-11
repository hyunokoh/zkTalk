'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { api, createAuthHeaders } from '@/lib/api';
import { getDesktopHarnessErrorMessage } from '@/lib/error-copy';
import { useTranslation } from '@/lib/i18n';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { clearSessionToken, getSessionToken, setSessionToken } from '@/lib/session-token';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@zktalk/shared';

type HarnessState = 'preparing' | 'sending' | 'redirecting' | 'error';
type DesktopHarnessMode = 'channel' | 'dm';

type DesktopHarnessRequest =
  | {
    mode: 'channel';
    sessionToken: string;
    body: string;
    channelId: string;
    communitySlug: string;
  }
  | {
    mode: 'dm';
    sessionToken: string;
    body: string;
    conversationId: string;
    };

export const DESKTOP_HARNESS_AUTH_OPTIONS = {
  authMode: 'bearer' as const,
};

function sendDesktopHarnessMessage(path: string, body: Record<string, unknown>) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('Desktop harness could not resolve the API base URL.');
  }

  const headers = createAuthHeaders(apiBaseUrl, undefined, DESKTOP_HARNESS_AUTH_OPTIONS.authMode);
  headers.set('Content-Type', 'application/json');

  void fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
    keepalive: true,
  });
}

type DesktopHarnessSummary = {
  modeLabel: string;
  destinationLabel: string;
  messagePreview: string;
};

function readParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function requireTrimmedParam(params: URLSearchParams, key: string): string {
  const value = params.get(key)?.trim();
  if (!value) {
    throw new Error(`Desktop harness is missing required ${key} query param.`);
  }

  return value;
}

function requireMode(mode: string | null): DesktopHarnessMode {
  if (mode === 'channel' || mode === 'dm') {
    return mode;
  }

  throw new Error(`Unsupported desktop harness mode: ${mode}`);
}

export function readDesktopHarnessRequest(params: URLSearchParams): DesktopHarnessRequest {
  const mode = requireMode(params.get('mode')?.trim() ?? null);
  const sessionToken = requireTrimmedParam(params, 'sessionToken');
  const body = requireTrimmedParam(params, 'body');

  if (mode === 'channel') {
    return {
      mode,
      sessionToken,
      body,
      channelId: requireTrimmedParam(params, 'channelId'),
      communitySlug: requireTrimmedParam(params, 'communitySlug'),
    };
  }

  return {
    mode,
    sessionToken,
    body,
    conversationId: requireTrimmedParam(params, 'conversationId'),
  };
}

function truncateMessagePreview(body: string): string {
  return body.length > 96 ? `${body.slice(0, 93)}...` : body;
}

export function buildDesktopHarnessSummary(
  request: DesktopHarnessRequest,
  t: (key: string, params?: Record<string, string | number>) => string,
): DesktopHarnessSummary {
  if (request.mode === 'channel') {
    return {
      modeLabel: t('desktopHarness.modeChannel'),
      destinationLabel: t('desktopHarness.destinationChannel', {
        communitySlug: request.communitySlug,
        channelId: request.channelId,
      }),
      messagePreview: truncateMessagePreview(request.body),
    };
  }

  return {
    modeLabel: t('desktopHarness.modeDm'),
    destinationLabel: t('desktopHarness.destinationDm', {
      conversationId: request.conversationId,
    }),
    messagePreview: truncateMessagePreview(request.body),
  };
}

export default function DesktopHarnessPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<HarnessState>('preparing');
  const [message, setMessage] = useState(t('desktopHarness.preparing'));
  const [summary, setSummary] = useState<DesktopHarnessSummary | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const request = readDesktopHarnessRequest(readParams());
      setSummary(buildDesktopHarnessSummary(request, t));

      const currentToken = getSessionToken();
      if (currentToken !== request.sessionToken) {
        clearSessionToken();
        setSessionToken(request.sessionToken, { desktopHarness: true });
      }

      const userResult = await api<{ user: User }>('/api/me', {
        ...DESKTOP_HARNESS_AUTH_OPTIONS,
      });
      if (cancelled) {
        return;
      }

      setUser(userResult.user);
      setState('sending');
      setMessage(t('desktopHarness.sending'));

      if (request.mode === 'channel') {
        sendDesktopHarnessMessage(`/api/channels/${request.channelId}/messages`, {
          bodyMarkdown: request.body,
        });

        if (!cancelled) {
          setState('redirecting');
          setMessage(t('desktopHarness.redirectingChannel'));
          window.location.replace(
            `/communities/${request.communitySlug}/channels/${request.channelId}`,
          );
        }
        return;
      }

      if (request.mode === 'dm') {
        sendDesktopHarnessMessage(`/api/dm/conversations/${request.conversationId}/messages`, {
          bodyMarkdown: request.body,
        });

        if (!cancelled) {
          setState('redirecting');
          setMessage(t('desktopHarness.redirectingDm'));
          window.location.replace(`/dm/${request.conversationId}`);
        }
      }
    }

    run().catch((error) => {
      if (cancelled) {
        return;
      }

      setState('error');
      setMessage(getDesktopHarnessErrorMessage(t, error));
    });

    return () => {
      cancelled = true;
    };
  }, [setUser, t]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#b2c7d9] px-6 text-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/90 px-6 py-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#607384]">
          {t('desktopHarness.label')}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#203040]">
          {state === 'error' ? t('desktopHarness.failedTitle') : t('desktopHarness.inProgressTitle')}
        </h1>
        <p className="mt-3 text-sm text-[#53667a]">{message}</p>
        {summary ? (
          <dl className="mt-5 rounded-2xl bg-[#eef4f8] px-4 py-4 text-left">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607384]">
                {t('desktopHarness.modeLabel')}
              </dt>
              <dd className="mt-1 text-sm text-[#203040]">{summary.modeLabel}</dd>
            </div>
            <div className="mt-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607384]">
                {t('desktopHarness.destinationLabel')}
              </dt>
              <dd className="mt-1 break-all text-sm text-[#203040]">{summary.destinationLabel}</dd>
            </div>
            <div className="mt-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#607384]">
                {t('desktopHarness.messagePreviewLabel')}
              </dt>
              <dd className="mt-1 text-sm text-[#203040]">{summary.messagePreview}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </main>
  );
}
