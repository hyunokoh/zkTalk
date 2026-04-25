'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommandExecution, CommandExecutionStatus } from '@zktalk/shared';
import { collectReadableCodexOutput } from '@zktalk/shared';
import { decideCommand } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export interface CommandResultBubbleProps {
  command: CommandExecution;
  /** Only the device owner can approve; passed in from the page. */
  canApprove?: boolean;
}

// AI agents whose stdout IS the conversational response. For these we render
// the output as a chat-style bubble with markdown — not a stdout/stderr pair.
const AI_AGENT_SLUGS = new Set(['codex', 'claude', 'claude-code']);

function isAiAgent(agentSlug: string): boolean {
  return AI_AGENT_SLUGS.has(agentSlug);
}

/**
 * The string the user actually typed before slash parsing. For AI agents we
 * surface this as a "self" bubble so the conversation reads top-to-bottom
 * (you said X → agent replied Y).
 */
function extractUserPrompt(command: CommandExecution): string {
  if (command.args && command.args.trim().length > 0) {
    return command.args.trim();
  }
  const raw = command.rawCommand ?? '';
  if (!raw.startsWith('/')) return raw.trim();
  const space = raw.indexOf(' ');
  return space === -1 ? '' : raw.slice(space + 1).trim();
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

interface BubbleSharedProps {
  command: CommandExecution;
  canApprove?: boolean;
}

export function CommandResultBubble({ command, canApprove }: CommandResultBubbleProps) {
  if (isAiAgent(command.agentSlug)) {
    return <AiAgentTurn command={command} canApprove={canApprove} />;
  }
  return <RawCommandResult command={command} canApprove={canApprove} />;
}

// ── AI agent turn — renders as natural chat ───────────────────────────────

function AiAgentTurn({ command, canApprove }: BubbleSharedProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const decisionMutation = useDecisionMutation(command.id, command.deviceId, queryClient);

  const userPrompt = extractUserPrompt(command);
  // Defensive: rows written before the desktop driver knew the new
  // codex JSONL format may still contain raw `{"type":"item.completed",...}`
  // lines. Re-extract on display so old commands also read naturally.
  const reply = collectReadableCodexOutput(command.stdoutTrunc).trim();
  const rawErr = (command.stderrTrunc ?? '').trim();
  // Codex/claude write a lot of noise (warnings, telemetry hints, etc.) to
  // stderr even on success. Only surface stderr when the run actually failed
  // — otherwise it's just visual clutter for a working reply.
  const errMsg =
    command.status === 'failed' ||
    command.status === 'timeout' ||
    command.status === 'rejected'
      ? rawErr
      : '';
  const isPending =
    command.status === 'queued' ||
    command.status === 'approved' ||
    command.status === 'running';
  const showApprovalBar =
    canApprove && command.status === 'awaiting_approval' && !decisionMutation.isPending;

  return (
    <div data-testid={`command-bubble-${command.id}`} className="flex flex-col gap-2">
      {userPrompt ? (
        <div className="flex justify-end">
          <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-accent-soft px-3 py-2 text-[13px] leading-[20px] text-fg whitespace-pre-wrap break-words">
            {userPrompt}
          </div>
        </div>
      ) : null}

      <div className="flex justify-start">
        <div className="flex max-w-[85%] flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-fg-subtle">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-agent" aria-hidden="true" />
            <span className="font-semibold text-agent">{command.agentSlug}</span>
            <span aria-hidden="true">·</span>
            <span className={statusToneClass(command.status)}>{t(statusKey(command.status))}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatTime(command.queuedAt)}</span>
          </div>

          <div className="rounded-2xl rounded-tl-sm bg-agent-soft px-3 py-2.5 text-[13px] leading-[22px] text-fg break-words">
            {isPending && !reply ? (
              <span className="inline-flex items-center gap-1.5 text-fg-muted">
                <span className="agent-typing-dot" />
                <span className="agent-typing-dot" style={{ animationDelay: '120ms' }} />
                <span className="agent-typing-dot" style={{ animationDelay: '240ms' }} />
              </span>
            ) : reply ? (
              <MarkdownRenderer content={reply} />
            ) : (
              <span className="italic text-fg-muted">
                {t('agents.result.emptyAiReply')}
              </span>
            )}
          </div>

          {errMsg ? <AgentErrorDetail message={errMsg} /> : null}

          {showApprovalBar ? (
            <div
              data-testid={`command-bubble-approval-${command.id}`}
              className="mt-1 flex items-center gap-2"
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
        </div>
      </div>
    </div>
  );
}

function AgentErrorDetail({ message }: { message: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-danger hover:opacity-80"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>{t('agents.result.agentErrorLabel')}</span>
      </button>
      {open ? (
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-[16px] text-danger">
          {message}
        </pre>
      ) : null}
    </div>
  );
}

// ── Raw command result — shell / finder / browser etc. ────────────────────

function RawCommandResult({ command, canApprove }: BubbleSharedProps) {
  const [outputExpanded, setOutputExpanded] = useState(false);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const decisionMutation = useDecisionMutation(command.id, command.deviceId, queryClient);

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

function useDecisionMutation(
  commandId: string,
  deviceId: string,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return useMutation({
    mutationFn: async (decision: 'approved' | 'rejected') => {
      return decideCommand(commandId, decision);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-commands', deviceId] });
    },
  });
}
