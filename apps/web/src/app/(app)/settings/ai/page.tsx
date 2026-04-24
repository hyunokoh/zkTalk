'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchAiRuntime, getAiRuntimePresentation } from '@/lib/ai-runtime';
import { STORAGE_KEYS, writeAiSetting } from '@/lib/ai-settings';
import { useTranslation } from '@/lib/i18n';
import { getDesktopLocalAgentLanguagePreset } from '@/lib/runtime-config';
import {
  ensureDesktopLocalMachineBridgeOnline,
  readDesktopLocalMachineBridgeState,
  type DesktopLocalMachineBridgeSnapshot,
} from '@/lib/local-machine-bridge-loopback';
import { useAuthStore } from '@/stores/auth';
import {
  getLocalMachineCommandCopyKey,
  getLocalMachineCommandTone,
} from '@/lib/local-machine-command-copy';
import { fetchUserSettings, saveTranslationDisplay } from '@/lib/user-settings';
import {
  getTranslationDisplayPreset,
  getSelectedMessageAiBehavior,
  listAiCapabilities,
  listTranslationDisplayPresets,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayPresetId,
  summarizeTranslationDisplayPreference,
  validateTranslationDisplayInput,
  type SelectedMessageAiAction,
  type AiCapabilityId,
  type LocalMachineCommandUpdate,
  type TranslationDisplayMode,
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
    <div className="rounded-2xl border border-line bg-bg-subtle/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-fg-muted">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ${
            enabled ? 'bg-accent' : 'bg-bg-subtle'
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

function getLocalMachineToneClasses(
  update: Pick<LocalMachineCommandUpdate, 'status' | 'errorCode'>,
) {
  switch (getLocalMachineCommandTone(update)) {
    case 'success':
      return 'border-success/40 bg-success/30 text-success';
    case 'warning':
      return 'border-warning/40 bg-warning/30 text-warning';
    case 'danger':
      return 'border-danger/40 bg-danger/30 text-danger';
    case 'info':
    default:
      return 'border-accent/40 bg-accent-soft/30 text-accent';
  }
}

function getDesktopBridgeRecentUpdates(
  snapshot: DesktopLocalMachineBridgeSnapshot | null | undefined,
): LocalMachineCommandUpdate[] {
  if (!snapshot) {
    return [];
  }

  if (Array.isArray(snapshot.recentCommandUpdates) && snapshot.recentCommandUpdates.length > 0) {
    return snapshot.recentCommandUpdates;
  }

  return snapshot.lastCommand ? [snapshot.lastCommand] : [];
}

export default function AISettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
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
  const { data: desktopBridgeSnapshot } = useQuery({
    queryKey: ['desktop-local-machine-bridge', user?.id ?? null],
    queryFn: () =>
      user?.id
        ? ensureDesktopLocalMachineBridgeOnline({
            ownerUserId: user.id,
          })
        : readDesktopLocalMachineBridgeState(),
    staleTime: 1_000,
    refetchInterval: 2_000,
  });
  const [isSavingTranslationPreset, setIsSavingTranslationPreset] = useState(false);
  const [translationPresetError, setTranslationPresetError] = useState<string | null>(null);
  const [translationMode, setTranslationMode] = useState<TranslationDisplayMode>('manual_only');
  const [targetLanguageInput, setTargetLanguageInput] = useState('');
  const [readableLanguagesInput, setReadableLanguagesInput] = useState('');

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
        return t('settings.aiPage.runtimeProviderMock');
      case 'unset':
      default:
        return t('settings.aiPage.runtimeProviderUnset');
    }
  }, [runtime?.provider, t]);
  const selectedMessageBehaviorItems = useMemo(
    () =>
      (['reply-draft', 'rewrite-draft', 'translate-inline'] as SelectedMessageAiAction[]).map(
        (action) => {
          const behavior = getSelectedMessageAiBehavior(action);

          if (behavior.effect === 'create-reply-draft') {
            return t('settings.aiPage.mobileBehavior.replyDraft');
          }

          if (behavior.effect === 'replace-composer-draft') {
            return t('settings.aiPage.mobileBehavior.rewriteDraft');
          }

          return t('settings.aiPage.mobileBehavior.translateInline');
        },
      ),
    [t],
  );
  const bridgeLanguagePresets = useMemo(() => listTranslationDisplayPresets(), []);
  const webCapabilities = useMemo(() => listAiCapabilities('web'), []);
  const desktopCapabilities = useMemo(() => listAiCapabilities('desktop'), []);
  const mobileCapabilities = useMemo(() => listAiCapabilities('mobile'), []);
  const settingsSurfaceRows = useMemo(
    () => [
      {
        platform: t('settings.aiPage.platform.web'),
        surface: t('settings.aiPage.surface.web.title'),
        detail: t('settings.aiPage.surface.web.detail'),
      },
      {
        platform: t('settings.aiPage.platform.desktop'),
        surface: t('settings.aiPage.surface.desktop.title'),
        detail: t('settings.aiPage.surface.desktop.detail'),
      },
      {
        platform: t('settings.aiPage.platform.mobile'),
        surface: t('settings.aiPage.surface.mobile.title'),
        detail: t('settings.aiPage.surface.mobile.detail'),
      },
    ],
    [t],
  );
  const activeTranslationPresetId = useMemo<TranslationDisplayPresetId | null>(
    () => resolveTranslationDisplayPresetId(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const translationPreferenceSummary = useMemo(
    () => summarizeTranslationDisplayPreference(userSettings?.translationDisplay),
    [userSettings?.translationDisplay],
  );
  const currentDesktopBridgePreset = useMemo(() => {
    const presetId = getDesktopLocalAgentLanguagePreset();
    return presetId
      ? (bridgeLanguagePresets.find((preset) => preset.id === presetId) ?? null)
      : null;
  }, [bridgeLanguagePresets]);
  const recentDesktopBridgeUpdates = useMemo(
    () => getDesktopBridgeRecentUpdates(desktopBridgeSnapshot).slice().reverse(),
    [desktopBridgeSnapshot],
  );

  useEffect(() => {
    const normalizedPreference = normalizeTranslationDisplayPreference(
      userSettings?.translationDisplay,
    );
    setTranslationMode(normalizedPreference.mode);
    setTargetLanguageInput(normalizedPreference.targetLanguage ?? '');
    setReadableLanguagesInput(normalizedPreference.readableLanguages.join(', '));
  }, [userSettings?.translationDisplay]);

  const handleTranslationPresetChange = async (presetId: TranslationDisplayPresetId) => {
    setIsSavingTranslationPreset(true);
    setTranslationPresetError(null);
    try {
      await saveTranslationDisplay(getTranslationDisplayPreset(presetId).translationDisplay);
      await refetchUserSettings();
    } catch {
      setTranslationPresetError(t('settings.aiPage.translationSaveError'));
    } finally {
      setIsSavingTranslationPreset(false);
    }
  };

  const handleCustomTranslationSave = async () => {
    setIsSavingTranslationPreset(true);
    setTranslationPresetError(null);
    const validation = validateTranslationDisplayInput({
      preference: userSettings?.translationDisplay,
      mode: translationMode,
      targetLanguageInput,
      readableLanguagesInput,
    });

    if (!validation.success) {
      setTranslationPresetError(
        validation.reason === 'invalid_readable_language'
          ? t('settings.aiPage.translationReadableValidationError', {
              language: validation.invalidLanguage ?? '',
            })
          : t('settings.aiPage.translationTargetValidationError'),
      );
      setIsSavingTranslationPreset(false);
      return;
    }

    try {
      await saveTranslationDisplay(validation.translationDisplay);
      await refetchUserSettings();
    } catch {
      setTranslationPresetError(t('settings.aiPage.translationSaveError'));
    } finally {
      setIsSavingTranslationPreset(false);
    }
  };

  const getCapabilityLabel = (capability: AiCapabilityId) => {
    switch (capability) {
      case 'rail-assistant':
        return t('settings.aiPage.capability.railAssistant');
      case 'composer-reply-suggestion':
        return t('settings.aiPage.capability.composerReplySuggestion');
      case 'composer-translate-english':
        return t('settings.aiPage.capability.composerTranslateEnglish');
      case 'composer-rewrite':
        return t('settings.aiPage.capability.composerRewrite');
      case 'selected-message-reply-draft':
        return t('settings.aiPage.capability.selectedMessageReplyDraft');
      case 'selected-message-rewrite-draft':
        return t('settings.aiPage.capability.selectedMessageRewriteDraft');
      case 'selected-message-translate-inline':
        return t('settings.aiPage.capability.selectedMessageTranslateInline');
      case 'channel-summary':
        return t('settings.aiPage.capability.channelSummary');
    }
  };

  const getLocalizedTranslationPreset = (presetId: TranslationDisplayPresetId) => ({
    label: t(`settings.aiPage.translationPreset.${presetId}.label`),
    description: t(`settings.aiPage.translationPreset.${presetId}.description`),
    bridgeInstruction: t(`settings.aiPage.translationPreset.${presetId}.bridgeInstruction`),
  });

  const getTranslationModeLabel = (mode: TranslationDisplayMode) => {
    switch (mode) {
      case 'target_language_all':
        return t('settings.aiPage.translationMode.target_language_all');
      case 'target_language_except_readable':
        return t('settings.aiPage.translationMode.target_language_except_readable');
      case 'manual_only':
      default:
        return t('settings.aiPage.translationMode.manual_only');
    }
  };

  const getTranslationSummary = (
    mode: TranslationDisplayMode,
    targetLanguage: string | null,
    readableLanguages: string[],
  ) => {
    if (mode === 'manual_only') {
      return t('settings.aiPage.translationSummary.manual_only');
    }

    if (mode === 'target_language_all') {
      return t('settings.aiPage.translationSummary.target_language_all', {
        targetLanguage: targetLanguage ?? t('settings.aiPage.none'),
      });
    }

    return t('settings.aiPage.translationSummary.target_language_except_readable', {
      targetLanguage: targetLanguage ?? t('settings.aiPage.none'),
      readableLanguages:
        readableLanguages.length > 0 ? readableLanguages.join(', ') : t('settings.aiPage.none'),
    });
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent/80">
            {t('settings.aiPage.eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-fg">{t('settings.aiPage.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">
            {t('settings.aiPage.description')}
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-full border border-line bg-bg-subtle px-4 py-2 text-sm font-semibold text-fg-muted transition hover:border-line hover:bg-bg-hover"
        >
          {t('settings.aiPage.backToSettings')}
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-4">
          <ToggleCard
            title={t('settings.aiPage.toggle.assistant.title')}
            description={t('settings.aiPage.toggle.assistant.description')}
            enabled={assistantEnabled}
            onToggle={() => setAssistantEnabled((prev) => !prev)}
          />

          <ToggleCard
            title={t('settings.aiPage.toggle.composer.title')}
            description={t('settings.aiPage.toggle.composer.description')}
            enabled={composerActionsEnabled}
            onToggle={() => setComposerActionsEnabled((prev) => !prev)}
          />

          <ToggleCard
            title={t('settings.aiPage.toggle.channelSummary.title')}
            description={t('settings.aiPage.toggle.channelSummary.description')}
            enabled={channelSummaryEnabled}
            onToggle={() => setChannelSummaryEnabled((prev) => !prev)}
          />

          <div
            id="translation-preferences"
            className="rounded-2xl border border-line bg-bg-subtle/60 p-5 scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">
                  {t('settings.aiPage.translation.title')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-fg-muted">
                  {t('settings.aiPage.translation.description')}
                </p>
              </div>
              <span className="rounded-full border border-line bg-bg-elevated/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {activeTranslationPresetId
                  ? getLocalizedTranslationPreset(activeTranslationPresetId).label
                  : t('settings.aiPage.translationCustom')}
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                  {t('settings.aiPage.translationActiveRule')}
                </p>
                <span
                  data-testid="translation-active-rule-mode"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted"
                >
                  {getTranslationModeLabel(translationPreferenceSummary.modeLabel)}
                </span>
              </div>
              <p
                data-testid="translation-active-rule-summary"
                className="mt-2 text-sm leading-6 text-fg-muted"
              >
                {getTranslationSummary(
                  translationPreferenceSummary.modeLabel,
                  translationPreferenceSummary.targetLanguage,
                  translationPreferenceSummary.readableLanguages,
                )}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-fg-muted">
                <span data-testid="translation-active-rule-target">
                  {t('settings.aiPage.translationTargetLabel')}:{' '}
                  {translationPreferenceSummary.targetLanguage ?? t('settings.aiPage.none')}
                </span>
                <span data-testid="translation-active-rule-readable">
                  {t('settings.aiPage.translationReadableLabel')}:{' '}
                  {translationPreferenceSummary.readableLanguages.length > 0
                    ? translationPreferenceSummary.readableLanguages.join(', ')
                    : t('settings.aiPage.none')}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {t('settings.aiPage.translationQuickPresets')}
              </p>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                {t('settings.aiPage.translationQuickPresetsDescription')}
              </p>
              <div className="mt-4 grid gap-3">
                {bridgeLanguagePresets.map((preset) => {
                  const isActive = activeTranslationPresetId === preset.id;
                  const localizedPreset = getLocalizedTranslationPreset(preset.id);

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`translation-preset-${preset.id}`}
                      disabled={isSavingTranslationPreset}
                      onClick={() => void handleTranslationPresetChange(preset.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-accent/60 bg-accent-soft/30'
                          : 'border-line bg-bg-elevated/40 hover:border-line hover:bg-bg-elevated/60'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-fg">{localizedPreset.label}</span>
                        {isActive ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                            {t('settings.aiPage.translationPresetActive')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-fg-muted">
                        {localizedPreset.description}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-fg-muted">
                        {t('settings.aiPage.translationBridgeDefault')}:{' '}
                        {localizedPreset.bridgeInstruction}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                  {t('settings.aiPage.translationCustomLanguageCodes')}
                </p>
                <span className="text-xs text-fg-muted">
                  {t('settings.aiPage.translationIsoCodesOnly')}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                {t('settings.aiPage.translationCustomDescription')}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="space-y-2 text-sm text-fg-muted">
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    {t('settings.aiPage.translationModeLabel')}
                  </span>
                  <select
                    data-testid="translation-mode-select"
                    value={translationMode}
                    onChange={(event) =>
                      setTranslationMode(event.target.value as TranslationDisplayMode)
                    }
                    className="w-full rounded-xl border border-line bg-bg-elevated/60 px-3 py-2 text-sm text-fg outline-none transition focus:border-accent/60"
                  >
                    <option value="manual_only">
                      {t('settings.aiPage.translationMode.manual_only')}
                    </option>
                    <option value="target_language_except_readable">
                      {t('settings.aiPage.translationMode.target_language_except_readable')}
                    </option>
                    <option value="target_language_all">
                      {t('settings.aiPage.translationMode.target_language_all')}
                    </option>
                  </select>
                </label>
                <label className="space-y-2 text-sm text-fg-muted">
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    {t('settings.aiPage.translationTargetInputLabel')}
                  </span>
                  <input
                    data-testid="translation-target-language-input"
                    value={targetLanguageInput}
                    onChange={(event) => setTargetLanguageInput(event.target.value)}
                    placeholder="pt-BR"
                    disabled={translationMode === 'manual_only'}
                    className="w-full rounded-xl border border-line bg-bg-elevated/60 px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
                <label className="space-y-2 text-sm text-fg-muted">
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                    {t('settings.aiPage.translationReadableInputLabel')}
                  </span>
                  <input
                    data-testid="translation-readable-languages-input"
                    value={readableLanguagesInput}
                    onChange={(event) => setReadableLanguagesInput(event.target.value)}
                    placeholder="en, ko, zh-Hant"
                    disabled={translationMode === 'target_language_all'}
                    className="w-full rounded-xl border border-line bg-bg-elevated/60 px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  data-testid="translation-custom-save-button"
                  disabled={isSavingTranslationPreset}
                  onClick={() => void handleCustomTranslationSave()}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-fg transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t('settings.aiPage.translationSaveButton')}
                </button>
                <p className="text-xs leading-5 text-fg-muted">
                  {t('settings.aiPage.translationModeHelp')}
                </p>
              </div>
            </div>
            <div className="mt-3 text-xs text-fg-muted">
              {isTranslationSettingsLoading
                ? t('settings.aiPage.translationLoadingSaved')
                : isSavingTranslationPreset
                  ? t('settings.aiPage.translationSaving')
                  : t('settings.aiPage.translationBuildNote')}
            </div>
            {translationPresetError ? (
              <div className="mt-2 text-sm text-danger">{translationPresetError}</div>
            ) : null}
          </div>

          <div
            id="machine-control"
            className="rounded-2xl border border-line bg-bg-subtle/60 p-5 scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-fg">
                  {t('settings.aiPage.machineControl.title')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-fg-muted">
                  {t('settings.aiPage.machineControl.description')}
                </p>
              </div>
              <span className="rounded-full border border-line bg-bg-elevated/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                {t('settings.aiPage.machineControl.queueBadge', { id: '271' })}
              </span>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/30 p-4">
              <p className="text-sm font-medium text-fg">
                {t('settings.aiPage.machineControl.availabilityTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-fg-muted">
                {t('settings.aiPage.machineControl.availabilityDescription')}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {settingsSurfaceRows.map((row) => (
                <div
                  key={row.platform}
                  className="rounded-2xl border border-line bg-bg-elevated/40 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-fg">{row.platform}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
                      {row.surface}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">{row.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-fg">
                    {t('settings.aiPage.machineControl.timelineTitle')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-fg-muted">
                    {t('settings.aiPage.machineControl.timelineDescription')}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-bg-elevated/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
                  {desktopBridgeSnapshot?.registered
                    ? (desktopBridgeSnapshot.machine?.presence ?? t('settings.aiPage.unknown'))
                    : t('settings.aiPage.machineControl.browserNoBridge')}
                </span>
              </div>
              {desktopBridgeSnapshot?.registered && desktopBridgeSnapshot.machine ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                    {desktopBridgeSnapshot.machine.name} · {desktopBridgeSnapshot.machine.id}
                  </p>
                  <p className="mt-1 text-sm text-fg-muted">
                    {t('settings.aiPage.machineControl.bridgeId', {
                      bridgeId: desktopBridgeSnapshot.machine.bridgeIdentifier,
                    })}
                  </p>
                  {recentDesktopBridgeUpdates.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {recentDesktopBridgeUpdates.map((update) =>
                        (() => {
                          const machineName =
                            desktopBridgeSnapshot.machine?.name ?? t('settings.aiPage.unknown');
                          return (
                            <div
                              key={`${update.commandId}-${update.status}-${update.createdAt}`}
                              className={`rounded-2xl border px-4 py-4 ${getLocalMachineToneClasses(update)}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm font-semibold">
                                  {t(getLocalMachineCommandCopyKey(update))}
                                </p>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
                                  {update.status}
                                </p>
                              </div>
                              <p className="mt-2 text-xs opacity-80">
                                {t('settings.aiPage.machineControl.commandMeta', {
                                  machine: machineName,
                                  commandId: update.commandId,
                                })}
                              </p>
                              {update.summary ? (
                                <p className="mt-2 text-sm leading-6">{update.summary}</p>
                              ) : null}
                              {update.outputText ? (
                                <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-bg-subtle p-3 text-xs leading-5 text-inherit whitespace-pre-wrap">
                                  {update.outputText}
                                </pre>
                              ) : null}
                              <p className="mt-3 text-xs opacity-70">{update.createdAt}</p>
                            </div>
                          );
                        })(),
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-fg-muted">
                      {t('settings.aiPage.machineControl.noCommands')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-fg-muted">
                  {t('settings.aiPage.machineControl.noDesktopBridge')}
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-line bg-bg-subtle/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
            {t('settings.aiPage.runtime.title')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold text-fg">{providerLabel}</h2>
            {runtimePresentation ? (
              <span
                className={
                  runtimePresentation.tone === 'live'
                    ? 'rounded-full border border-success/40 bg-success/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-success'
                    : runtimePresentation.tone === 'mock'
                      ? 'rounded-full border border-warning/40 bg-warning/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-warning'
                      : 'rounded-full border border-danger/40 bg-danger/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-danger'
                }
              >
                {runtimePresentation.label}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-fg-muted">
            {t('settings.aiPage.runtime.description')}
          </p>
          <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/70 p-4 text-sm text-fg-muted">
            <p className="font-medium text-fg">{t('settings.aiPage.runtime.sessionTitle')}</p>
            <p className="mt-2 leading-6">
              {runtimePresentation?.description ?? t('settings.aiPage.runtime.loading')}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-success/30 bg-success/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <span className="inline-block h-2 w-2 rounded-full bg-success" />
              {t('settings.aiPage.runtime.desktopPackagingTitle')}
            </div>
            <p className="mt-2 text-sm leading-6 text-success/70">
              {t('settings.aiPage.runtime.desktopPackagingDescription')}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft/20 p-4 text-sm text-accent/80">
            <p className="font-medium text-fg">{t('settings.aiPage.mobileActions.title')}</p>
            <p className="mt-2 leading-6">{t('settings.aiPage.mobileActions.description')}</p>
            <ul className="mt-3 space-y-2">
              {selectedMessageBehaviorItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-accent/70">
              {t('settings.aiPage.mobileActions.limitation')}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-agent/40 bg-agent-soft/20 p-4 text-sm text-agent/80">
            <p className="font-medium text-fg">{t('settings.aiPage.desktopPresets.title')}</p>
            <p className="mt-2 leading-6">{t('settings.aiPage.desktopPresets.description')}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-agent/70">
              {currentDesktopBridgePreset
                ? t('settings.aiPage.desktopPresets.current', {
                    preset: getLocalizedTranslationPreset(currentDesktopBridgePreset.id).label,
                  })
                : t('settings.aiPage.desktopPresets.notPinned')}
            </p>
            <ul className="mt-3 space-y-3">
              {bridgeLanguagePresets.map((preset) => (
                <li key={preset.id}>
                  <span className="font-medium text-fg">
                    {getLocalizedTranslationPreset(preset.id).label}
                  </span>
                  <span className="block mt-1 leading-6">
                    {getLocalizedTranslationPreset(preset.id).description}
                  </span>
                  <span className="block mt-1 text-agent/70">
                    {getLocalizedTranslationPreset(preset.id).bridgeInstruction}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-bg-elevated/70 p-4 text-sm text-fg-muted">
            <p className="font-medium text-fg">{t('settings.aiPage.platformFeatures.title')}</p>
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                  {t('settings.aiPage.platform.web')}
                </p>
                <ul className="mt-2 space-y-2">
                  {webCapabilities.map((capability) => (
                    <li key={`web-${capability}`}>• {getCapabilityLabel(capability)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                  {t('settings.aiPage.platform.desktop')}
                </p>
                <ul className="mt-2 space-y-2">
                  {desktopCapabilities.map((capability) => (
                    <li key={`desktop-${capability}`}>• {getCapabilityLabel(capability)}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
                  {t('settings.aiPage.platform.mobile')}
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
