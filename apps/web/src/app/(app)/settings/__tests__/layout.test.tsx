import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsLayout from '../layout';

let mockPathname = '/settings';
let mockLocale = 'ko';

const translations: Record<string, Record<string, string>> = {
  ko: {
    'settings.title': '설정',
    'settings.listSubtitle': '계정, 데이터, 알림과 개인 설정을 한 자리에서 관리하세요.',
    'settings.overview': '개요',
    'settings.accountSectionTitle': '계정',
    'settings.notificationsSectionTitle': '알림',
    'settings.languageSectionTitle': '언어',
    'settings.aiTranslationSectionTitle': 'AI와 번역',
    'settings.machineControlSectionTitle': '머신 제어',
    'settings.dataPrivacySectionTitle': '데이터와 개인정보',
  },
  en: {
    'settings.title': 'Settings',
    'settings.listSubtitle': 'Manage account, data, alerts, and preferences in one place.',
    'settings.overview': 'Overview',
    'settings.accountSectionTitle': 'Account',
    'settings.notificationsSectionTitle': 'Notifications',
    'settings.languageSectionTitle': 'Language',
    'settings.aiTranslationSectionTitle': 'AI and translation',
    'settings.machineControlSectionTitle': 'Machine control',
    'settings.dataPrivacySectionTitle': 'Data and privacy',
  },
};

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[mockLocale]?.[key] ?? key,
  }),
}));

describe('SettingsLayout', () => {
  beforeEach(() => {
    mockPathname = '/settings';
    mockLocale = 'ko';
  });

  it('renders the settings sidebar labels in Korean when locale is ko', () => {
    render(
      <SettingsLayout>
        <div>child</div>
      </SettingsLayout>,
    );

    expect(screen.getByRole('heading', { name: '설정' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '개요' }).getAttribute('href')).toBe('/settings');
    expect(screen.getByRole('link', { name: '계정' }).getAttribute('href')).toBe('/settings#account');
    expect(screen.getByRole('link', { name: '알림' }).getAttribute('href')).toBe(
      '/settings#notifications',
    );
    expect(screen.getByRole('link', { name: '언어' }).getAttribute('href')).toBe('/settings#language');
    expect(screen.getByRole('link', { name: 'AI와 번역' }).getAttribute('href')).toBe(
      '/settings/ai#translation-preferences',
    );
    expect(screen.getByRole('link', { name: '머신 제어' }).getAttribute('href')).toBe(
      '/settings/ai#machine-control',
    );
    expect(screen.getByRole('link', { name: '데이터와 개인정보' }).getAttribute('href')).toBe(
      '/settings#data-privacy',
    );
  });

  it('renders the settings sidebar labels in English when locale is en', () => {
    mockLocale = 'en';
    mockPathname = '/settings/ai';

    render(
      <SettingsLayout>
        <div>child</div>
      </SettingsLayout>,
    );

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('/settings');
    expect(screen.getByRole('link', { name: 'Account' }).getAttribute('href')).toBe('/settings#account');
    expect(screen.getByRole('link', { name: 'Notifications' }).getAttribute('href')).toBe(
      '/settings#notifications',
    );
    expect(screen.getByRole('link', { name: 'Language' }).getAttribute('href')).toBe(
      '/settings#language',
    );
    expect(screen.getByRole('link', { name: 'AI and translation' }).getAttribute('href')).toBe(
      '/settings/ai#translation-preferences',
    );
    expect(screen.getByRole('link', { name: 'Machine control' }).getAttribute('href')).toBe(
      '/settings/ai#machine-control',
    );
    expect(screen.getByRole('link', { name: 'Data and privacy' }).getAttribute('href')).toBe(
      '/settings#data-privacy',
    );
  });
});
