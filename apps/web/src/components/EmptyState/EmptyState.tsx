'use client';

import React from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-white/[0.03] px-8 py-14 text-center text-white/44 shadow-[0_24px_60px_rgba(2,8,23,0.18)] ${className}`.trim()}>
      <svg className="mb-4 h-12 w-12 text-white/24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 6.75h14.5v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10.5h8M8 14h5" />
      </svg>
      <p className="text-sm font-medium text-white/72">{title}</p>
      {description ? <p className="mt-2 max-w-xl text-sm text-white/48">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
