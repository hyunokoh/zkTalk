export const SETTINGS_SECTION_ORDER = [
  'account',
  'notifications',
  'language',
  'ai_translation',
  'machine_control',
  'data_privacy',
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_ORDER)[number];
export type SettingsPlatform = 'web' | 'desktop' | 'mobile';

export type SettingsSectionEntrypoint = {
  web: string;
  desktop: string;
  mobile: string;
};

export type MobileSettingsFocusTarget =
  | 'main'
  | 'language'
  | 'ai_translation'
  | 'machine_control';

export const SETTINGS_SECTION_ENTRYPOINTS: Record<SettingsSectionId, SettingsSectionEntrypoint> = {
  account: {
    web: '/settings#account',
    desktop: '/settings#account',
    mobile: 'SettingsScreen',
  },
  notifications: {
    web: '/settings#notifications',
    desktop: '/settings#notifications',
    mobile: 'SettingsScreen',
  },
  language: {
    web: '/settings#language',
    desktop: '/settings#language',
    mobile: 'LanguageSettings',
  },
  ai_translation: {
    web: '/settings/ai#translation-preferences',
    desktop: '/settings/ai#translation-preferences',
    mobile: 'AiSettings',
  },
  machine_control: {
    web: '/settings/ai#machine-control',
    desktop: '/settings/ai#machine-control',
    mobile: 'AiSettings',
  },
  data_privacy: {
    web: '/settings#data-privacy',
    desktop: '/settings#data-privacy',
    mobile: 'SettingsScreen',
  },
};

export function getSettingsSectionEntrypoint(
  sectionId: SettingsSectionId,
  platform: SettingsPlatform,
) {
  return SETTINGS_SECTION_ENTRYPOINTS[sectionId][platform];
}

export function sortSettingsSectionIds(sectionIds: readonly SettingsSectionId[]) {
  const knownIds = new Set<SettingsSectionId>(SETTINGS_SECTION_ORDER);

  return [...sectionIds]
    .filter((sectionId): sectionId is SettingsSectionId => knownIds.has(sectionId))
    .sort(
      (left, right) => SETTINGS_SECTION_ORDER.indexOf(left) - SETTINGS_SECTION_ORDER.indexOf(right),
    );
}

export function getMobileSettingsFocusTarget(sectionId: 'language'): 'language';
export function getMobileSettingsFocusTarget(sectionId: 'ai_translation'): 'ai_translation';
export function getMobileSettingsFocusTarget(sectionId: 'machine_control'): 'machine_control';
export function getMobileSettingsFocusTarget(
  sectionId: 'account' | 'notifications' | 'data_privacy',
): 'main';
export function getMobileSettingsFocusTarget(
  sectionId: SettingsSectionId,
): MobileSettingsFocusTarget {
  switch (sectionId) {
    case 'language':
      return 'language';
    case 'ai_translation':
      return 'ai_translation';
    case 'machine_control':
      return 'machine_control';
    case 'account':
    case 'notifications':
    case 'data_privacy':
    default:
      return 'main';
  }
}
