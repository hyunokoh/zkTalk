import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '../LanguageSwitcher';

const setLocale = vi.fn();
const getConfig = vi.fn(async () => ({
  apiUrl: 'http://127.0.0.1:4000',
  wsUrl: 'ws://127.0.0.1:4000/api/ws',
  livekitUrl: 'ws://127.0.0.1:7880',
  appLocale: 'ko',
}));
const saveConfig = vi.fn(async (config: unknown) => config);

vi.mock('@/lib/i18n', () => ({
  localeNames: {
    en: 'English',
    ko: '한국어',
  },
  useI18nStore: (
    selector: (state: { locale: 'ko' | 'en'; setLocale: typeof setLocale }) => unknown,
  ) =>
    selector({
      locale: 'ko',
      setLocale,
    }),
}));

describe('LanguageSwitcher', () => {
  it('syncs the selected locale into the desktop config when available', async () => {
    window.zkTalkDesktop = {
      getConfig,
      saveConfig,
    };

    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(setLocale).toHaveBeenCalledWith('en');
    await waitFor(() => {
      expect(getConfig).toHaveBeenCalled();
      expect(saveConfig).toHaveBeenCalledWith({
        apiUrl: 'http://127.0.0.1:4000',
        wsUrl: 'ws://127.0.0.1:4000/api/ws',
        livekitUrl: 'ws://127.0.0.1:7880',
        appLocale: 'en',
      });
    });
  });
});
