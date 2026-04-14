import { describe, expect, it } from 'vitest';
import {
  getMobileSettingsFocusTarget,
  getSettingsSectionEntrypoint,
  SETTINGS_SECTION_ORDER,
  sortSettingsSectionIds,
} from '../utils/settings-navigation';

describe('settings-navigation', () => {
  it('keeps conceptual settings sections in a stable cross-platform order', () => {
    expect(SETTINGS_SECTION_ORDER).toEqual([
      'account',
      'notifications',
      'language',
      'ai_translation',
      'machine_control',
      'data_privacy',
    ]);
    expect(
      sortSettingsSectionIds([
        'machine_control',
        'account',
        'data_privacy',
        'ai_translation',
        'language',
      ]),
    ).toEqual(['account', 'language', 'ai_translation', 'machine_control', 'data_privacy']);
  });

  it('maps language, machine control, and AI translation into stable discoverability surfaces by platform', () => {
    expect(getSettingsSectionEntrypoint('language', 'web')).toBe('/settings#language');
    expect(getSettingsSectionEntrypoint('language', 'desktop')).toBe('/settings#language');
    expect(getSettingsSectionEntrypoint('language', 'mobile')).toBe('LanguageSettings');
    expect(getSettingsSectionEntrypoint('ai_translation', 'web')).toBe(
      '/settings/ai#translation-preferences',
    );
    expect(getSettingsSectionEntrypoint('machine_control', 'web')).toBe(
      '/settings/ai#machine-control',
    );
    expect(getSettingsSectionEntrypoint('ai_translation', 'mobile')).toBe('AiSettings');
    expect(getSettingsSectionEntrypoint('machine_control', 'mobile')).toBe('AiSettings');
    expect(getMobileSettingsFocusTarget('language')).toBe('language');
    expect(getMobileSettingsFocusTarget('ai_translation')).toBe('ai_translation');
    expect(getMobileSettingsFocusTarget('machine_control')).toBe('machine_control');
  });

  it('keeps core account, notification, and privacy discovery on the main mobile settings screen', () => {
    expect(getSettingsSectionEntrypoint('account', 'mobile')).toBe('SettingsScreen');
    expect(getSettingsSectionEntrypoint('notifications', 'mobile')).toBe('SettingsScreen');
    expect(getSettingsSectionEntrypoint('data_privacy', 'mobile')).toBe('SettingsScreen');
    expect(getMobileSettingsFocusTarget('account')).toBe('main');
    expect(getMobileSettingsFocusTarget('notifications')).toBe('main');
    expect(getMobileSettingsFocusTarget('data_privacy')).toBe('main');
  });
});
