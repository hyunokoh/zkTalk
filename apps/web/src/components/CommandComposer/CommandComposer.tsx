'use client';

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AgentDevice, DeviceAgent } from '@zktalk/shared';
import { queueCommand } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';

export interface CommandComposerProps {
  device: AgentDevice;
  agents: DeviceAgent[];
  disabled?: boolean;
  /**
   * Which agent to route plain-text (natural-language) input to when the user
   * doesn't use the slash-command syntax. Defaults to 'codex'. The composer
   * will fall back to 'shell' if neither 'codex' nor the configured default
   * agent is installed on the current device.
   */
  defaultAiAgentSlug?: string;
}

type InputMode = 'natural' | 'slash';

interface ParsedCommand {
  mode: InputMode;
  agentSlug: string | null;
  verb: string | null;
  args: string;
  valid: boolean;
  reason?: string;
}

/**
 * Parse composer input.
 *
 * Two supported modes:
 *   1. NATURAL  — bare text, routes to the device's AI agent (codex by
 *      default) as a single `args` prompt. No slash prefix needed. This is
 *      the "write in plain language" path Anna asked for.
 *   2. SLASH    — classic `/<deviceSlug>.<agentSlug>[.<verb>] <args>` for
 *      power users who want to pick a specific agent / verb.
 */
function parseCommand(
  input: string,
  currentDeviceSlug: string,
  defaultAiAgentSlug: string,
  installedAgentSlugs: Set<string>,
): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      mode: 'natural',
      agentSlug: null,
      verb: null,
      args: '',
      valid: false,
      reason: 'empty',
    };
  }

  // Natural-language mode: anything that isn't a slash command. Route to the
  // default AI agent (codex) with the entire input as `args`.
  if (!trimmed.startsWith('/')) {
    const fallback = installedAgentSlugs.has(defaultAiAgentSlug)
      ? defaultAiAgentSlug
      : installedAgentSlugs.has('codex')
        ? 'codex'
        : installedAgentSlugs.has('claude')
          ? 'claude'
          : null;
    if (!fallback) {
      return {
        mode: 'natural',
        agentSlug: null,
        verb: null,
        args: trimmed,
        valid: false,
        reason: 'no_ai_agent_installed',
      };
    }
    return {
      mode: 'natural',
      agentSlug: fallback,
      verb: null,
      args: trimmed,
      valid: true,
    };
  }

  // Slash mode.
  const [head, ...rest] = trimmed.slice(1).split(/\s+/);
  const args = rest.join(' ').trim();
  const parts = head.split('.');

  const deviceSlug = parts[0] ?? '';
  const agentSlug = parts[1] ?? null;
  // Anything past `.<agent>.<verb>` belongs to the verb segment — joining
  // the tail keeps `/dev.codex.fix.bug` from silently dropping `.bug`.
  const verb = parts.length > 2 ? parts.slice(2).join('.') : null;

  if (deviceSlug !== currentDeviceSlug) {
    return {
      mode: 'slash',
      agentSlug,
      verb,
      args,
      valid: false,
      reason: 'wrong_device',
    };
  }

  if (!agentSlug) {
    return {
      mode: 'slash',
      agentSlug: null,
      verb,
      args,
      valid: false,
      reason: 'missing_agent',
    };
  }

  return { mode: 'slash', agentSlug, verb, args, valid: true };
}

export function CommandComposer({
  device,
  agents,
  disabled,
  defaultAiAgentSlug = 'codex',
}: CommandComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const installedAgentSlugs = useMemo(
    () => new Set(agents.filter((a) => a.isEnabled).map((a) => a.agentSlug)),
    [agents],
  );

  const parsed = useMemo(
    () => parseCommand(value, device.slug, defaultAiAgentSlug, installedAgentSlugs),
    [value, device.slug, defaultAiAgentSlug, installedAgentSlugs],
  );

  const mutation = useMutation({
    mutationFn: async (rawCommand: string) => {
      if (!parsed.valid || !parsed.agentSlug) {
        throw new Error('Invalid command');
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
    // Suggestions only fire in slash mode after "/<deviceSlug>."
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
    ? (mutation.error as Error)?.message || t('agents.composer.failedQueue')
    : parsed.reason === 'wrong_device'
      ? t('agents.composer.helperWrongDevice', { deviceSlug: device.slug })
      : parsed.reason === 'missing_agent'
        ? t('agents.composer.helperMissingAgent', { deviceSlug: device.slug })
        : parsed.reason === 'no_ai_agent_installed'
          ? t('agents.composer.helperNoAiAgent', {
              deviceName: device.name,
              deviceSlug: device.slug,
            })
          : parsed.mode === 'natural' && parsed.valid && parsed.agentSlug
            ? t('agents.composer.helperNaturalValid', {
                agentSlug: parsed.agentSlug,
                deviceName: device.name,
              })
            : t('agents.composer.helperDefault');

  const isNaturalMode = parsed.mode === 'natural';

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
          aria-label={t('agents.composer.suggestionsLabel')}
        >
          {suggestions.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => applySuggestion(a.agentSlug)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg hover:bg-bg-hover"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-agent" aria-hidden="true" />
                <span className="font-medium">
                  /{device.slug}.{a.agentSlug}
                </span>
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
          placeholder={t('agents.composer.placeholder', { deviceName: device.name })}
          disabled={disabled || mutation.isPending}
          className={`min-h-[40px] max-h-[160px] flex-1 resize-none rounded-md border border-line bg-bg-elevated px-3 py-2 text-[14px] leading-[20px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none disabled:opacity-60 ${
            isNaturalMode ? '' : 'font-mono text-[13px]'
          }`}
        />
        <button
          type="submit"
          data-testid="command-composer-send"
          disabled={!canSend}
          className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-[color:var(--on-accent)] transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {mutation.isPending ? t('agents.composer.sending') : t('agents.composer.send')}
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
