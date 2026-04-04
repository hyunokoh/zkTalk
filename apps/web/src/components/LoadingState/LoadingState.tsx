'use client';

import React from 'react';

type LoadingStateProps = {
  message: string;
  className?: string;
  compact?: boolean;
};

export function LoadingState({ message, className = '', compact = false }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${compact ? 'p-4' : 'px-6 py-12'} ${className}`.trim()}>
      <div className={`rounded-2xl border border-white/10 bg-white/[0.04] text-center shadow-[0_22px_56px_rgba(2,8,23,0.28)] backdrop-blur-xl ${compact ? 'px-4 py-3' : 'px-6 py-5'}`}>
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-sky-300" />
        <p className="text-sm font-medium text-white/72">{message}</p>
      </div>
    </div>
  );
}
