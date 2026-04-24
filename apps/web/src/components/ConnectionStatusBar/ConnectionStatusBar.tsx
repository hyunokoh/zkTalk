'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useWebSocketStatus } from '@/hooks/useWebSocket';

type ConnectionStatusBarProps = {
  className?: string;
};

export function ConnectionStatusBar({ className = '' }: ConnectionStatusBarProps) {
  const { t } = useTranslation();
  const socketStatus = useWebSocketStatus();
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  const state = useMemo(() => {
    if (isOffline || socketStatus === 'offline') {
      return {
        tone: 'bg-danger/95 text-white border-danger/30',
        title: t('connection.offlineTitle'),
        body: t('connection.offlineBody'),
      };
    }

    if (socketStatus === 'reconnecting' || socketStatus === 'connecting') {
      return {
        tone: 'bg-warning/95 text-slate-950 border-warning/60',
        title: t('connection.reconnectingTitle'),
        body: t('connection.reconnectingBody'),
      };
    }

    return null;
  }, [isOffline, socketStatus, t]);

  if (!state) {
    return null;
  }

  return (
    <div className={`border-b px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.22)] ${state.tone} ${className}`.trim()}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
        <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-90" />
        <div className="min-w-0">
          <p className="font-semibold">{state.title}</p>
          <p className="text-xs opacity-90 sm:text-sm">{state.body}</p>
        </div>
      </div>
    </div>
  );
}
