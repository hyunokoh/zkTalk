import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import en from './locales/en';
import ko from './locales/ko';

export type Locale = 'en' | 'ko';

const translations: Record<Locale, Record<string, string>> = { en, ko };

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
};

// Detect device language
function getDeviceLocale(): Locale {
  try {
    const deviceLocale =
      Platform.OS === 'ios'
        ? NativeModules.SettingsManager?.settings?.AppleLocale ??
          NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ??
          'ko'
        : NativeModules.I18nManager?.localeIdentifier ?? 'ko';
    return deviceLocale.startsWith('en') ? 'en' : 'ko';
  } catch {
    return 'ko';
  }
}

interface I18nState {
  locale: Locale;
  ready: boolean;
  setLocale: (locale: Locale) => void;
  loadLocale: () => Promise<void>;
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: getDeviceLocale(),
  ready: false,

  setLocale: (locale: Locale) => {
    set({ locale });
    AsyncStorage.setItem('zktalk-locale', locale).catch(() => {});
  },

  loadLocale: async () => {
    try {
      const saved = await AsyncStorage.getItem('zktalk-locale');
      if (saved === 'en' || saved === 'ko') {
        set({ locale: saved, ready: true });
      } else {
        set({ ready: true });
      }
    } catch {
      set({ ready: true });
    }
  },
}));

// Initialize locale on import
useI18nStore.getState().loadLocale();

/**
 * Get a translated string (non-reactive).
 */
export function t(key: string, params?: Record<string, string | number>): string {
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
 * React hook for translations (triggers re-render on locale change).
 */
export function useTranslation() {
  const locale = useI18nStore((s) => s.locale);

  function translate(key: string, params?: Record<string, string | number>): string {
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
