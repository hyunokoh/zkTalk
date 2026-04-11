const STORAGE_KEYS = {
  assistantEnabled: 'zktalk_ai_assistant_enabled',
  composerActionsEnabled: 'zktalk_ai_composer_actions_enabled',
  channelSummaryEnabled: 'zktalk_ai_channel_summary_enabled',
} as const;

export const AI_SETTINGS_UPDATED_EVENT = 'zktalk-ai-settings-updated';
const AI_USER_SURFACE_ENABLED = false;

function readBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  const raw = window.localStorage.getItem(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return defaultValue;
}

export function writeAiSetting(key: string, value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, String(value));
  window.dispatchEvent(new CustomEvent(AI_SETTINGS_UPDATED_EVENT));
}

export function isAiAssistantEnabled(): boolean {
  return AI_USER_SURFACE_ENABLED && readBoolean(STORAGE_KEYS.assistantEnabled, true);
}

export function isAiComposerActionsEnabled(): boolean {
  return AI_USER_SURFACE_ENABLED && readBoolean(STORAGE_KEYS.composerActionsEnabled, true);
}

export function isAiChannelSummaryEnabled(): boolean {
  return AI_USER_SURFACE_ENABLED && readBoolean(STORAGE_KEYS.channelSummaryEnabled, true);
}

export { STORAGE_KEYS };
