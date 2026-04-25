'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AgentThread } from '@zktalk/shared';
import {
  createAgentThread,
  deleteAgentThread,
  fetchAgentThreads,
  renameAgentThread,
} from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';

const DEFAULT_THREAD_KEY = '__default__';

export type ActiveThreadKey = string | typeof DEFAULT_THREAD_KEY;

export const DEFAULT_THREAD = DEFAULT_THREAD_KEY;

interface AgentThreadListProps {
  deviceId: string;
  activeThreadId: ActiveThreadKey;
  onSelectThread: (threadId: ActiveThreadKey) => void;
}

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = now - t;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return '';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function PlusIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5l4 4-12 12H4.5v-4l12-12z" />
    </svg>
  );
}

function TrashIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1.5 13a2 2 0 002 1.5h5a2 2 0 002-1.5L18 7" />
    </svg>
  );
}

export function AgentThreadList({
  deviceId,
  activeThreadId,
  onSelectThread,
}: AgentThreadListProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const now = useMemo(() => Date.now(), []);

  const { data, isLoading } = useQuery({
    queryKey: ['agent-threads', deviceId],
    queryFn: () => fetchAgentThreads(deviceId),
    staleTime: 10_000,
  });

  const threads = data ?? [];

  const createMutation = useMutation({
    mutationFn: () => createAgentThread(deviceId),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ['agent-threads', deviceId] });
      onSelectThread(thread.id);
    },
  });

  const handleNewThread = () => {
    if (createMutation.isPending) return;
    createMutation.mutate();
  };

  return (
    <aside
      data-testid="agent-thread-list"
      className="flex w-[220px] shrink-0 flex-col border-r border-line bg-bg-subtle/50"
    >
      <header className="flex h-12 items-center gap-2 border-b border-line px-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
          {t('agents.threads.title')}
        </span>
        <button
          type="button"
          data-testid="agent-thread-new"
          onClick={handleNewThread}
          disabled={createMutation.isPending}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2 text-[11px] font-semibold text-[color:var(--on-accent)] transition hover:bg-accent-strong disabled:opacity-60"
          aria-label={t('agents.threads.newAria')}
        >
          <PlusIcon />
          {t('agents.threads.new')}
        </button>
      </header>

      <nav className="flex flex-col gap-0.5 overflow-auto px-2 py-2" aria-label={t('agents.threads.title')}>
        <ThreadButton
          label={t('agents.threads.defaultLabel')}
          isActive={activeThreadId === DEFAULT_THREAD_KEY}
          onClick={() => onSelectThread(DEFAULT_THREAD_KEY)}
          subtitle={t('agents.threads.defaultSubtitle')}
        />

        {isLoading ? (
          <div className="px-3 py-2 text-[12px] text-fg-subtle">{t('agents.device.loading')}</div>
        ) : null}

        {threads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            isActive={activeThreadId === thread.id}
            relativeTime={formatRelative(thread.lastMessageAt, now)}
            onClick={() => onSelectThread(thread.id)}
            onRenamed={() => queryClient.invalidateQueries({ queryKey: ['agent-threads', deviceId] })}
            onDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ['agent-threads', deviceId] });
              if (activeThreadId === thread.id) onSelectThread(DEFAULT_THREAD_KEY);
            }}
          />
        ))}
      </nav>
    </aside>
  );
}

function ThreadButton({
  label,
  subtitle,
  isActive,
  onClick,
  testId,
}: {
  label: string;
  subtitle?: string;
  isActive: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId ?? 'agent-thread-default'}
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
        isActive ? 'bg-bg-hover text-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg'
      }`}
    >
      <span className="font-medium">{label}</span>
      {subtitle ? (
        <span className="text-[11px] text-fg-subtle">{subtitle}</span>
      ) : null}
    </button>
  );
}

function ThreadRow({
  thread,
  isActive,
  relativeTime,
  onClick,
  onRenamed,
  onDeleted,
}: {
  thread: AgentThread;
  isActive: boolean;
  relativeTime: string;
  onClick: () => void;
  onRenamed: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(thread.title);

  const renameMutation = useMutation({
    mutationFn: (next: string) => renameAgentThread(thread.id, next),
    onSuccess: () => {
      setIsEditing(false);
      onRenamed();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteAgentThread(thread.id),
    onSuccess: onDeleted,
  });

  const display = thread.title.trim().length > 0 ? thread.title : t('agents.threads.untitled');

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md bg-bg-hover px-2 py-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          className="h-7 flex-1 rounded-sm border border-accent bg-bg-elevated px-1.5 text-[12px] text-fg outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter') renameMutation.mutate(draft.trim());
            if (e.key === 'Escape') {
              setIsEditing(false);
              setDraft(thread.title);
            }
          }}
        />
        <button
          type="button"
          onClick={() => renameMutation.mutate(draft.trim())}
          disabled={renameMutation.isPending}
          className="rounded-sm bg-accent px-1.5 py-1 text-[10px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-60"
        >
          {t('common.save')}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group/thread relative flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ${
        isActive ? 'bg-bg-hover text-fg' : 'text-fg-muted hover:bg-bg-hover hover:text-fg'
      }`}
    >
      <button
        type="button"
        data-testid={`agent-thread-${thread.id}`}
        onClick={onClick}
        className="flex flex-1 flex-col items-start gap-0.5 text-left"
      >
        <span className="line-clamp-1 font-medium">{display}</span>
        {relativeTime ? (
          <span className="text-[11px] text-fg-subtle">{relativeTime}</span>
        ) : null}
      </button>
      <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 opacity-0 transition group-hover/thread:opacity-100">
        <button
          type="button"
          data-testid={`agent-thread-rename-${thread.id}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
            setDraft(thread.title);
          }}
          aria-label={t('agents.threads.renameAria')}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:bg-bg-elevated hover:text-fg"
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          data-testid={`agent-thread-delete-${thread.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t('agents.threads.deleteConfirm'))) {
              deleteMutation.mutate();
            }
          }}
          aria-label={t('agents.threads.deleteAria')}
          className="inline-flex h-5 w-5 items-center justify-center rounded text-fg-subtle hover:bg-danger/15 hover:text-danger"
        >
          <TrashIcon />
        </button>
      </span>
    </div>
  );
}
