import { api } from './api';
import type { UpdateUserSettingsInput, UserSettings } from '@zktalk/shared';

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await api<{ settings: UserSettings }>('/api/me/settings');
  return response.settings;
}

export async function saveTranslationDisplay(
  translationDisplay: UpdateUserSettingsInput['translationDisplay'],
): Promise<UserSettings> {
  const response = await api<{ settings: UserSettings }>('/api/me/settings', {
    method: 'PATCH',
    body: { translationDisplay },
  });

  return response.settings;
}
