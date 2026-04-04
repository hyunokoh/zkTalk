'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { clearSessionToken, getSessionToken, setSessionToken } from '@/lib/session-token';
import { useAuthStore } from '@/stores/auth';

type HarnessState = 'preparing' | 'sending' | 'redirecting' | 'error';

function readParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export default function DesktopHarnessPage() {
  const [state, setState] = useState<HarnessState>('preparing');
  const [message, setMessage] = useState('Preparing desktop regression...');
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = readParams();
      const mode = params.get('mode');
      const sessionToken = params.get('sessionToken')?.trim();
      const body = params.get('body') ?? '';
      const channelId = params.get('channelId');
      const conversationId = params.get('conversationId');
      const communitySlug = params.get('communitySlug');

      if (!sessionToken || !body || !mode) {
        throw new Error('Desktop harness is missing required query params.');
      }

      const currentToken = getSessionToken();
      if (currentToken !== sessionToken) {
        clearSessionToken();
        setSessionToken(sessionToken);
      }

      setState('sending');
      setMessage('Sending desktop regression message...');

      await fetchUser();
      await api('/api/me');

      if (mode === 'channel') {
        if (!channelId || !communitySlug) {
          throw new Error('Channel harness route requires communitySlug and channelId.');
        }

        await api(`/api/channels/${channelId}/messages`, {
          method: 'POST',
          body: {
            bodyMarkdown: body,
          },
        });

        if (!cancelled) {
          setState('redirecting');
          setMessage('Redirecting to the channel...');
          window.location.replace(`/communities/${communitySlug}/channels/${channelId}`);
        }
        return;
      }

      if (mode === 'dm') {
        if (!conversationId) {
          throw new Error('DM harness route requires conversationId.');
        }

        await api(`/api/dm/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: {
            bodyMarkdown: body,
          },
        });

        if (!cancelled) {
          setState('redirecting');
          setMessage('Redirecting to the DM...');
          window.location.replace(`/dm/${conversationId}`);
        }
        return;
      }

      throw new Error(`Unsupported desktop harness mode: ${mode}`);
    }

    run().catch((error) => {
      if (cancelled) {
        return;
      }

      setState('error');
      setMessage(error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [fetchUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#b2c7d9] px-6 text-center">
      <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/90 px-6 py-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#607384]">
          Desktop Harness
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-[#203040]">
          {state === 'error' ? 'Desktop send failed' : 'Desktop regression in progress'}
        </h1>
        <p className="mt-3 text-sm text-[#53667a]">{message}</p>
      </div>
    </main>
  );
}
