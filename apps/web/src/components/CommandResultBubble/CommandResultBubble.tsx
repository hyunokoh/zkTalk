'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommandExecution, CommandExecutionStatus } from '@zktalk/shared';
import { decideCommand } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';

export interface CommandResultBubbleProps {
  command: CommandExecution;
  /** Only the device owner can approve; passed in from the page. */
  canApprove?: boolean;
}

function statusKey(status: CommandExecutionStatus): string {
  switch (status) {
    case 'queued':
      return 'agents.result.status.queued';
    case 'awaiting_approval':
      return 'agents.result.status.awaitingApproval';
    case 'approved':
      return 'agents.result.status.approved';
    case 'running':
      return 'agents.result.status.running';
    case 'completed':
      return 'agents.result.status.completed';
    case 'failed':
      return 'agents.result.status.failed';
    case 'rejected':
      return 'agents.result.status.rejected';
    case 'timeout':
      return 'agents.result.status.timeout';
    case 'cancelled':
      return 'agents.result.status.cancelled';
    default:
      // Server may add new states later; degrade to the raw value rather
      // than rendering `undefined`.
      return String(status);
  }
}

function statusToneClass(status: CommandExecutionStatus): string {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'failed':
    case 'rejected':
    case 'timeout':
      return 'text-danger';
    case 'awaiting_approval':
      return 'text-warning';
    case 'running':
    case 'approved':
      return 'text-agent';
    default:
      return 'text-fg-muted';
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function CommandResultBubble({ command, canApprove }: CommandResultBubbleProps) {
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const decisionMutation = useMutation({
    mutationFn: async (decision: 'approved' | 'rejected') => {
      return decideCommand(command.id, decision);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-commands', command.deviceId] });
    },
  });

  const stdout = command.stdoutTrunc ?? '';
  const stderr = command.stderrTrunc ?? '';
  const hasStdout = stdout.length > 0;
  const hasStderr = stderr.length > 0;
  const showApprovalBar =
    canApprove && command.status === 'awaiting_approval' && !decisionMutation.isPending;

  return (
    <article
      data-testid={`command-bubble-${command.id}`}
      className="flex flex-col gap-2 rounded-md border border-line bg-bg-elevated px-3 py-2"
    >
      <header className="flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
        <span className={`font-semibold uppercase tracking-[0.06em] ${statusToneClass(command.status)}`}>
          {t(statusKey(command.status))}
        </span>
        {command.exitCode !== null ? (
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 font-mono text-[10px] text-fg-muted">
            {t('agents.result.exit', { code: command.exitCode })}
          </span>
        ) : null}
        <span className="ml-auto tabular-nums">{formatTime(command.queuedAt)}</span>
      </header>

      <code
        data-testid={`command-bubble-raw-${command.id}`}
        className="block whitespace-pre-wrap break-words rounded-sm bg-bg-subtle px-2 py-1.5 font-mono text-[12px] leading-[18px] text-fg"
      >
        {command.rawCommand}
      </code>

      {hasStdout ? (
        <div>
          <button
            type="button"
            onClick={() => setOutputExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-fg-muted hover:text-fg"
          >
            <span>{outputExpanded ? '▾' : '▸'}</span>
            <span>{t('agents.result.stdout')}</span>
            <span className="text-fg-subtle">
              {t('agents.result.charsCount', { count: stdout.length })}
            </span>
          </button>
          {outputExpanded ? (
            <pre className="mt-1 max-h-64 overflow-auto rounded-sm bg-bg-subtle p-2 font-mono text-[12px] leading-[18px] text-fg">
              {stdout}
            </pre>
          ) : null}
        </div>
      ) : null}

      {hasStderr ? (
        <div>
          <button
            type="button"
            onClick={() => setErrorExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-danger hover:opacity-80"
          >
            <span>{errorExpanded ? '▾' : '▸'}</span>
            <span>{t('agents.result.stderr')}</span>
            <span className="text-fg-subtle">
              {t('agents.result.charsCount', { count: stderr.length })}
            </span>
          </button>
          {errorExpanded ? (
            <pre className="mt-1 max-h-64 overflow-auto rounded-sm border border-danger bg-bg-subtle p-2 font-mono text-[12px] leading-[18px] text-fg">
              {stderr}
            </pre>
          ) : null}
        </div>
      ) : null}

      {showApprovalBar ? (
        <div
          data-testid={`command-bubble-approval-${command.id}`}
          className="flex items-center gap-2 border-t border-line pt-2"
        >
          <span className="text-[11px] text-fg-muted">
            {t('agents.result.approvalPrompt')}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => decisionMutation.mutate('rejected')}
              disabled={decisionMutation.isPending}
              className="h-7 rounded-md border border-line px-3 text-[12px] font-medium text-fg-muted hover:border-line-strong hover:text-fg disabled:opacity-50"
            >
              {t('agents.result.reject')}
            </button>
            <button
              type="button"
              onClick={() => decisionMutation.mutate('approved')}
              disabled={decisionMutation.isPending}
              className="h-7 rounded-md bg-accent px-3 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
            >
              {t('agents.result.approve')}
            </button>
          </div>
        </div>
      ) : null}

      {decisionMutation.isError ? (
        <p className="text-[11px] text-danger">
          {(decisionMutation.error as Error)?.message || t('agents.result.decisionFailed')}
        </p>
      ) : null}
    </article>
  );
}
