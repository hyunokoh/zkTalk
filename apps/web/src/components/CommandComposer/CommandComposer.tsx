'use client';

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentDevice, DeviceAgent } from '@zktalk/shared';
import { queueCommand } from '@/lib/api-agents';

export interface CommandComposerProps {
  device: AgentDevice;
  agents: DeviceAgent[];
  disabled?: boolean;
}

interface ParsedCommand {
  agentSlug: string | null;
  verb: string | null;
  args: string;
  valid: boolean;
  reason?: string;
}

/**
 * Parse a slash command of form:
 *   /<deviceSlug>[.<agentSlug>[.<verb>]] <args>
 * Device slug is optional because the composer is scoped to a specific device
 * — if the user types a different device, we still accept it and route via
 * deviceSlug on the API call.
 */
function parseCommand(input: string, currentDeviceSlug: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return { agentSlug: null, verb: null, args: '', valid: false, reason: 'empty' };
  }

  if (!trimmed.startsWith('/')) {
    return {
      agentSlug: null,
      verb: null,
      args: trimmed,
      valid: false,
      reason: 'missing_slash',
    };
  }

  const [head, ...rest] = trimmed.slice(1).split(/\s+/);
  const args = rest.join(' ').trim();
  const parts = head.split('.');

  // parts = [deviceSlug?, agentSlug?, verb?]
  const deviceSlug = parts[0] ?? '';
  const agentSlug = parts[1] ?? null;
  const verb = parts[2] ?? null;

  if (deviceSlug !== currentDeviceSlug) {
    return {
      agentSlug,
      verb,
      args,
      valid: false,
      reason: 'wrong_device',
    };
  }

  if (!agentSlug) {
    return {
      agentSlug: null,
      verb,
      args,
      valid: false,
      reason: 'missing_agent',
    };
  }

  return { agentSlug, verb, args, valid: true };
}

export function CommandComposer({ device, agents, disabled }: CommandComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const parsed = useMemo(() => parseCommand(value, device.slug), [value, device.slug]);

  const mutation = useMutation({
    mutationFn: async (rawCommand: string) => {
      if (!parsed.valid || !parsed.agentSlug) {
        throw new Error('Invalid command syntax');
      }
      return queueCommand({
        deviceSlug: device.slug,
        agentSlug: parsed.agentSlug,
        verb: parsed.verb ?? undefined,
        args: parsed.args || undefined,
        rawCommand,
      });
    },
    onSuccess: () => {
      setValue('');
      queryClient.invalidateQueries({ queryKey: ['agent-commands', device.id] });
    },
  });

  const suggestions = useMemo(() => {
    // Only show suggestions when user has typed "/<deviceSlug>." but no agent yet,
    // or has typed "/<deviceSlug>.<partial>" that doesn't match any installed agent.
    if (!value.startsWith(`/${device.slug}.`)) return [];
    const afterDot = value.slice(device.slug.length + 2).split(/\s+/)[0] ?? '';
    const [agentFragment] = afterDot.split('.');
    if (!agentFragment) {
      return agents.filter((a) => a.isEnabled).slice(0, 6);
    }
    if (agents.some((a) => a.agentSlug === agentFragment)) return [];
    return agents
      .filter((a) => a.isEnabled && a.agentSlug.startsWith(agentFragment))
      .slice(0, 6);
  }, [agents, device.slug, value]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!parsed.valid || disabled || mutation.isPending) return;
    mutation.mutate(value.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applySuggestion = (agentSlug: string) => {
    const prefix = `/${device.slug}.${agentSlug} `;
    setValue(prefix);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(prefix.length, prefix.length);
      }
    });
  };

  const canSend = parsed.valid && !disabled && !mutation.isPending;

  const helperText = mutation.isError
    ? (mutation.error as Error)?.message || 'Failed to queue command'
    : parsed.reason === 'missing_slash'
      ? `Start with /${device.slug}.<agent>`
      : parsed.reason === 'wrong_device'
        ? `Device does not match /${device.slug}`
        : parsed.reason === 'missing_agent'
          ? `Add an agent, e.g. /${device.slug}.shell ls`
          : `Enter sends · Shift+Enter for newline`;

  return (
    <form
      data-testid="command-composer"
      onSubmit={handleSubmit}
      className="relative flex flex-col gap-2 border-t border-line bg-bg px-4 py-3"
    >
      {suggestions.length > 0 && (
        <ul
          className="absolute bottom-[calc(100%+4px)] left-4 right-4 z-10 max-h-56 overflow-auto rounded-md border border-line bg-bg-elevated py-1 shadow-[var(--shadow-2)]"
          role="listbox"
          aria-label="Agent suggestions"
        >
          {suggestions.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => applySuggestion(a.agentSlug)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg hover:bg-bg-hover"
              >
                <span className="h-1.5 w-1.5 rounded-pill bg-agent" aria-hidden="true" />
                <span className="font-medium">/{device.slug}.{a.agentSlug}</span>
                <span className="text-fg-muted">· {a.displayName}</span>
                {a.version ? (
                  <span className="ml-auto text-fg-subtle">@{a.version}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          data-testid="command-composer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={`/${device.slug}.shell ls ~/Downloads`}
          disabled={disabled || mutation.isPending}
          className="min-h-[40px] max-h-[160px] flex-1 resize-none rounded-md border border-line bg-bg-elevated px-3 py-2 font-mono text-[13px] leading-[20px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          data-testid="command-composer-send"
          disabled={!canSend}
          className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-[color:var(--on-accent)] transition hover:bg-accent-strong disabled:opacity-50"
        >
          {mutation.isPending ? 'Sending…' : 'Send'}
        </button>
      </div>

      <p
        className={`text-[11px] ${
          mutation.isError || (!parsed.valid && value.trim().length > 0)
            ? 'text-danger'
            : 'text-fg-subtle'
        }`}
      >
        {helperText}
      </p>
    </form>
  );
}
