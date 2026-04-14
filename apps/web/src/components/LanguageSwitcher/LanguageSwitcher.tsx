'use client';

import React from 'react';
import { useI18nStore, localeNames, type Locale } from '@/lib/i18n';

export function LanguageSwitcher() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const locales = Object.entries(localeNames) as [Locale, string][];

  const syncDesktopLocale = async (nextLocale: Locale) => {
    if (typeof window === 'undefined' || !window.zkTalkDesktop?.saveConfig) {
      return;
    }

    const currentConfig =
      typeof window.zkTalkDesktop.getConfig === 'function'
        ? await window.zkTalkDesktop.getConfig()
        : undefined;
    const baseConfig =
      currentConfig && typeof currentConfig === 'object'
        ? (currentConfig as Record<string, unknown>)
        : {};

    await window.zkTalkDesktop.saveConfig({
      ...baseConfig,
      appLocale: nextLocale,
    });
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map(([code, name]) => (
        <button
          key={code}
          onClick={() => {
            setLocale(code);
            void syncDesktopLocale(code);
          }}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            locale === code
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
