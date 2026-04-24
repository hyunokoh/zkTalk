'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommandExecution, CommandExecutionStatus } from '@zktalk/shared';
import { decideCommand } from '@/lib/api-agents';

export interface CommandResultBubbleProps {
  command: CommandExecution;
  /** Only the device owner can approve; passed in from the page. */
  canApprove?: boolean;
}

function statusLabel(status: CommandExecutionStatus): string {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'awaiting_approval':
      return 'Awaiting approval';
    case 'approved':
      return 'Approved';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'rejected':
      return 'Rejected';
    case 'timeout':
      return 'Timed out';
    case 'cancelled':
      return 'Cancelled';
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

  const decisionMutation = useMutation({
    mutationFn: async (decision: 'approved' | 'rejected') => {
      return decideCommand(command.id, decision);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-commands', command.deviceId] });
    },
  });

  const hasStdout = Boolean(command.stdoutTrunc && command.stdoutTrunc.length > 0);
  const hasStderr = Boolean(command.stderrTrunc && command.stderrTrunc.length > 0);
  const showApprovalBar =
    canApprove && command.status === 'awaiting_approval' && !decisionMutation.isPending;

  return (
    <article
      data-testid={`command-bubble-${command.id}`}
      className="flex flex-col gap-2 rounded-md border border-line bg-bg-elevated px-3 py-2"
    >
      <header className="flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
        <span className={`font-semibold uppercase tracking-[0.06em] ${statusToneClass(command.status)}`}>
          {statusLabel(command.status)}
        </span>
        {command.exitCode !== null ? (
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 font-mono text-[10px] text-fg-muted">
            exit {command.exitCode}
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
            <span>stdout</span>
            <span className="text-fg-subtle">
              ({command.stdoutTrunc!.length} chars)
            </span>
          </button>
          {outputExpanded ? (
            <pre className="mt-1 max-h-64 overflow-auto rounded-sm bg-bg-subtle p-2 font-mono text-[12px] leading-[18px] text-fg">
              {command.stdoutTrunc}
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
            <span>stderr</span>
            <span className="text-fg-subtle">
              ({command.stderrTrunc!.length} chars)
            </span>
          </button>
          {errorExpanded ? (
            <pre className="mt-1 max-h-64 overflow-auto rounded-sm border border-danger bg-bg-subtle p-2 font-mono text-[12px] leading-[18px] text-fg">
              {command.stderrTrunc}
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
            This command needs your approval before it runs.
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => decisionMutation.mutate('rejected')}
              disabled={decisionMutation.isPending}
              className="h-7 rounded-md border border-line px-3 text-[12px] font-medium text-fg-muted hover:border-line-strong hover:text-fg disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => decisionMutation.mutate('approved')}
              disabled={decisionMutation.isPending}
              className="h-7 rounded-md bg-accent px-3 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      ) : null}

      {decisionMutation.isError ? (
        <p className="text-[11px] text-danger">
          {(decisionMutation.error as Error)?.message || 'Decision failed'}
        </p>
      ) : null}
    </article>
  );
}
