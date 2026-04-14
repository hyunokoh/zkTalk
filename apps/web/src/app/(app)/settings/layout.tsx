'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import {
  getSettingsSectionEntrypoint,
  SETTINGS_SECTION_ORDER,
  type SettingsSectionId,
} from '@zktalk/shared';

const SECTION_LABEL_KEYS: Record<SettingsSectionId, string> = {
  account: 'settings.accountSectionTitle',
  notifications: 'settings.notificationsSectionTitle',
  language: 'settings.languageSectionTitle',
  ai_translation: 'settings.aiTranslationSectionTitle',
  machine_control: 'settings.machineControlSectionTitle',
  data_privacy: 'settings.dataPrivacySectionTitle',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const navItems = [
    { href: '/settings', label: t('settings.overview'), active: pathname === '/settings' },
    ...SETTINGS_SECTION_ORDER.map((sectionId) => ({
      href: getSettingsSectionEntrypoint(sectionId, 'web'),
      label: t(SECTION_LABEL_KEYS[sectionId]),
        active:
        pathname === '/settings/ai'
          ? sectionId === 'ai_translation' || sectionId === 'machine_control'
          : pathname === '/settings'
            ? sectionId === 'account' ||
              sectionId === 'notifications' ||
              sectionId === 'language' ||
              sectionId === 'data_privacy'
            : false,
    })),
  ];

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 p-4">
        <div className="mb-5 rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
          <h2 className="text-base font-semibold text-white">{t('settings.title')}</h2>
          <p className="mt-2 text-xs leading-5 text-gray-400">{t('settings.listSubtitle')}</p>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    item.active
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
