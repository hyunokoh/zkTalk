'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchAiRuntime, getAiRuntimePresentation } from '@/lib/ai-runtime';
import { STORAGE_KEYS, writeAiSetting } from '@/lib/ai-settings';
import { useTranslation } from '@/lib/i18n';
import { getDesktopLocalAgentLanguagePreset } from '@/lib/runtime-config';
import { fetchUserSettings, saveTranslationDisplay } from '@/lib/user-settings';
import {
  getTranslationDisplayPreset,
  getSelectedMessageAiBehavior,
  listAiCapabilities,
  listTranslationDisplayPresets,
  resolveTranslationDisplayPresetId,
  type SelectedMessageAiAction,
  type AiCapabilityId,
  type TranslationDisplayPresetId,
} from '@zktalk/shared';

function useStoredBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') setValue(true);
    if (raw === 'false') setValue(false);
  }, [key]);

  const setStoredValue = (next: boolean | ((prev: boolean) => boolean)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      writeAiSetting(key, resolved);
      return resolved;
    });
  };

  return [value, setStoredValue] as const;
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            enabled ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const { t } = useTranslation();
  const [assistantEnabled, setAssistantEnabled] = useStoredBoolean(
    STORAGE_KEYS.assistantEnabled,
    true,
  );
  const [composerActionsEnabled, setComposerActionsEnabled] = useStoredBoolean(
    STORAGE_KEYS.composerActionsEnabled,
    true,
  );
  const [channelSummaryEnabled, setChannelSummaryEnabled] = useStoredBoolean(
    STORAGE_KEYS.channelSummaryEnabled,
    true,
  );
  const { data: runtime } = useQuery({
    queryKey: ['ai-runtime'],
    queryFn: fetchAiRuntime,
    staleTime: 30_000,
  });
  const {
    data: userSettings,
    refetch: refetchUserSettings,
    isLoading: isTranslationSettingsLoading,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    staleTime: 30_000,
  });
  const [isSavingTranslationPreset, setIsSavingTranslationPreset] = useState(false);
  const [translationPresetError, setTranslationPresetError] = useState<string | null>(null);

  const runtimePresentation = useMemo(() => getAiRuntimePresentation(t, runtime), [runtime, t]);
  const providerLabel = useMemo(() => {
    switch (runtime?.provider) {
      case 'openrouter':
        return 'OpenRouter';
      case 'anthropic':
        return 'Anthropic';
      case 'gemini':
        return 'Gemini';
      case 'mock':
        return 'Mock provider';
      case 'unset':
      default:
        return 'Not configured';
    }
  }, [runtime?.provider]);
  const selectedMessageBehaviorItems = useMemo(
    () =>
      (['reply-draft', 'rewrite-draft', 'translate-inline'] as SelectedMessageAiAction[]).map(
        (action) => {
          const behavior = getSelectedMessageAiBehavior(action);

          if (behavior.effect === 'create-reply-draft') {
            return 'Selected-message reply draft keeps the composer reply path.';
          }

          if (behavior.effect === 'replace-composer-draft') {
            return 'Selected-message rewrite replaces the current composer draft.';
          }

          return 'Selected-message translation stays inline on the message instead of mutating the composer.';
        },
      ),
    [],
  );
  const bridgeLanguagePresets = useMemo(() => listTranslationDisplayPresets(), []);
  const webCapabilities = useMemo(() => listAiCapabilities('web'), []);
  const desktopCapabilities = useMemo(() => listAiCapabilities('desktop'), []);
  const mobileCapabilities = useMemo(() => listAiCapabilities('mobile'), []);
  const activeTranslationPresetId = useMemo<TranslationDisplayPresetId | null>(
    () => resolveTranslationDisplayPresetId(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const currentDesktopBridgePreset = useMemo(() => {
    const presetId = getDesktopLocalAgentLanguagePreset();
    return presetId
      ? (bridgeLanguagePresets.find((preset) => preset.id === presetId) ?? null)
      : null;
  }, [bridgeLanguagePresets]);
  const handleTranslationPresetChange = async (presetId: TranslationDisplayPresetId) => {
    setIsSavingTranslationPreset(true);
    setTranslationPresetError(null);
    try {
      await saveTranslationDisplay(getTranslationDisplayPreset(presetId).translationDisplay);
      await refetchUserSettings();
    } catch {
      setTranslationPresetError('Could not save translation preference.');
    } finally {
      setIsSavingTranslationPreset(false);
    }
  };

  const getCapabilityLabel = (capability: AiCapabilityId) => {
    switch (capability) {
      case 'rail-assistant':
        return 'Rail assistant modal';
      case 'composer-reply-suggestion':
        return 'Current-draft composer reply suggestion';
      case 'composer-translate-english':
        return 'Current-draft translate to English';
      case 'composer-rewrite':
        return 'Current-draft rewrite / polish';
      case 'selected-message-reply-draft':
        return 'Selected-message reply draft into the composer';
      case 'selected-message-rewrite-draft':
        return 'Selected-message rewrite of the current composer draft';
      case 'selected-message-translate-inline':
        return 'Selected-message translation inline on the message';
      case 'channel-summary':
        return 'Channel summary from the composer actions menu';
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300/80">AI</p>
          <h1 className="mt-2 text-3xl font-bold text-white">AI settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Manage which AI tools appear on web and packaged desktop: the rail assistant,
            current-draft composer actions, selected-message draft tools, and channel summaries.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
        >
          Back to settings
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-4">
          <ToggleCard
            title="AI assistant"
            description="Show the global AI assistant panel from the community rail sparkle button."
            enabled={assistantEnabled}
            onToggle={() => setAssistantEnabled((prev) => !prev)}
          />

          <ToggleCard
            title="Composer actions"
            description="Enable AI actions around the composer: reply suggestion, translate-to-English, rewrite for the current draft, and selected-message reply/rewrite drafts."
            enabled={composerActionsEnabled}
            onToggle={() => setComposerActionsEnabled((prev) => !prev)}
          />

          <ToggleCard
            title="Channel summary"
            description="Allow AI-generated summaries for the current channel from the composer actions menu."
            enabled={channelSummaryEnabled}
            onToggle={() => setChannelSummaryEnabled((prev) => !prev)}
          />

          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Automatic translation</h2>
                <p className="mt-1 text-sm leading-6 text-gray-400">
                  Choose how incoming messages auto-render for this account. Manual per-message
                  translate remains available even when automatic rendering is on.
                </p>
              </div>
              <span className="rounded-full border border-gray-700 bg-gray-950/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                {activeTranslationPresetId ?? 'custom'}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {bridgeLanguagePresets.map((preset) => {
                const isActive = activeTranslationPresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`translation-preset-${preset.id}`}
                    disabled={isSavingTranslationPreset}
                    onClick={() => void handleTranslationPresetChange(preset.id)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-sky-500/60 bg-sky-950/30'
                        : 'border-gray-800 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-950/60'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{preset.label}</span>
                      {isActive ? (
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-400">{preset.description}</p>
                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Bridge default: {preset.bridgeInstruction}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              {isTranslationSettingsLoading
                ? 'Loading saved translation preference...'
                : isSavingTranslationPreset
                  ? 'Saving translation preference...'
                  : 'Automatic translation applies first to web channel messages in this build.'}
            </div>
            {translationPresetError ? (
              <div className="mt-2 text-sm text-rose-300">{translationPresetError}</div>
            ) : null}
          </div>
        </section>

        <aside className="rounded-3xl border border-gray-800 bg-gray-900/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Current runtime
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-white">{providerLabel}</h2>
            {runtimePresentation ? (
              <span
                className={
                  runtimePresentation.tone === 'live'
                    ? 'rounded-full border border-emerald-700/40 bg-emerald-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200'
                    : runtimePresentation.tone === 'mock'
                      ? 'rounded-full border border-amber-700/40 bg-amber-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200'
                      : 'rounded-full border border-rose-700/40 bg-rose-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-200'
                }
              >
                {runtimePresentation.label}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Web and packaged desktop both route AI requests through the same app/API path. The
            runtime badge below reflects whether the current backend is using a real provider, mock
            output, or no usable AI at all.
          </p>
          <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
            <p className="font-medium text-white">What this session will do</p>
            <p className="mt-2 leading-6">
              {runtimePresentation?.description ?? 'Runtime status is still loading.'}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Desktop packaging can inject runtime keys
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-100/70">
              Current packaged desktop builds can pass provider keys into the bundled web server,
              but browser and mobile sessions still depend on the deployed backend runtime that the
              UI reports at use time.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-sky-800/40 bg-sky-950/20 p-4 text-sm text-sky-100/80">
            <p className="font-medium text-white">Mobile message actions</p>
            <p className="mt-2 leading-6">
              On mobile, AI currently starts from a selected message. It can draft a reply into the
              composer or rewrite the current composer draft with that message as context. Message
              translation stays in the regular translate action.
            </p>
            <ul className="mt-3 space-y-2">
              {selectedMessageBehaviorItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-sky-200/70">
              Mobile in this build does not expose the rail assistant, current-draft composer AI
              menu, or channel summary entry points.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-violet-800/40 bg-violet-950/20 p-4 text-sm text-violet-100/80">
            <p className="font-medium text-white">Desktop local machine bridge presets</p>
            <p className="mt-2 leading-6">
              The desktop-first local Codex bridge uses stable language presets so host and worker
              machines do not guess how to present streamed updates or final results.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-violet-200/70">
              {currentDesktopBridgePreset
                ? `Current desktop preset: ${currentDesktopBridgePreset.id}`
                : 'Current desktop preset: not pinned in desktop config'}
            </p>
            <ul className="mt-3 space-y-3">
              {bridgeLanguagePresets.map((preset) => (
                <li key={preset.id}>
                  <span className="font-medium text-white">{preset.id}</span>
                  <span className="block mt-1 leading-6">{preset.description}</span>
                  <span className="block mt-1 text-violet-200/70">{preset.bridgeInstruction}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-400">
            <p className="font-medium text-white">Included AI features by platform</p>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Web
                </p>
                <ul className="mt-2 space-y-2">
                  {webCapabilities.map((capability) => (
                    <li key={`web-${capability}`}>• {getCapabilityLabel(capability)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Desktop
                </p>
                <ul className="mt-2 space-y-2">
                  {desktopCapabilities.map((capability) => (
                    <li key={`desktop-${capability}`}>• {getCapabilityLabel(capability)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  Mobile
                </p>
                <ul className="mt-2 space-y-2">
                  {mobileCapabilities.map((capability) => (
                    <li key={`mobile-${capability}`}>• {getCapabilityLabel(capability)}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
