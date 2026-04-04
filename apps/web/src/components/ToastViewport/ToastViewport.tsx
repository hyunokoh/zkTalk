'use client';

import { useEffect } from 'react';
import { useToastStore } from '@/stores/toast';

type ToastViewportProps = {
  className?: string;
};

const TONE_STYLES = {
  success: 'border-emerald-400/35 bg-emerald-500/95 text-white',
  error: 'border-rose-300/35 bg-rose-500/95 text-white',
  info: 'border-sky-300/35 bg-sky-500/95 text-white',
} as const;

export function ToastViewport({ className = '' }: ToastViewportProps) {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) => {
      const durationMs = toast.durationMs ?? 3200;
      return window.setTimeout(() => {
        dismissToast(toast.id);
      }, durationMs);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismissToast, toasts]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={`pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-3 ${className}`.trim()}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_22px_44px_rgba(15,23,42,0.28)] backdrop-blur ${TONE_STYLES[toast.tone]}`}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
              <p className={`text-sm ${toast.title ? 'mt-1 opacity-95' : ''}`}>{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md px-1 text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Dismiss notification"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
