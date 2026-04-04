import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en, { type TranslationKey } from './locales/en';
import ko from './locales/ko';

export type Locale = 'en' | 'ko';

const translations: Record<Locale, Record<string, string>> = {
  en,
  ko,
};

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'ko',
      setLocale: (locale: Locale) => set({ locale }),
    }),
    { name: 'zktalk-locale' },
  ),
);

/**
 * Get a translated string with optional interpolation.
 * Usage: t('auth.welcome') or t('thread.replyCount', { count: 5 })
 */
export function t(key: TranslationKey | string, params?: Record<string, string | number>): string {
  const locale = useI18nStore.getState().locale;
  let text = translations[locale]?.[key] ?? translations.en[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(value));
    }
  }

  return text;
}

/**
 * React hook for translations that triggers re-render on locale change.
 */
export function useTranslation() {
  const locale = useI18nStore((s) => s.locale);

  function translate(key: TranslationKey | string, params?: Record<string, string | number>): string {
    let text = translations[locale]?.[key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(value));
      }
    }
    return text;
  }

  return { t: translate, locale };
}
