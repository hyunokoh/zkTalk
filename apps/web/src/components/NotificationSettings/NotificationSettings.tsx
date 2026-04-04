'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
  type NotificationPreferences,
} from '@/lib/notifications';

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleRow({ label, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className={`text-sm ${disabled ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPrefs);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
    } else {
      setPermissionState(Notification.permission);
    }
  }, []);

  const updatePref = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      setNotificationPrefs(next);
      return next;
    });
  }, []);

  const handleEnableToggle = useCallback(async (checked: boolean) => {
    if (checked && permissionState !== 'granted') {
      const result = await requestNotificationPermission();
      if (result) {
        setPermissionState(result);
      }
      if (result !== 'granted') return;
    }
    updatePref('enabled', checked);
  }, [permissionState, updatePref]);

  const isEnabled = prefs.enabled && permissionState === 'granted';

  return (
    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {t('notification.settings')}
      </h3>

      <div className="space-y-1">
        <ToggleRow
          label={t('notification.enable')}
          checked={prefs.enabled && permissionState === 'granted'}
          onChange={handleEnableToggle}
          disabled={permissionState === 'denied' || permissionState === 'unsupported'}
        />

        {permissionState === 'denied' && (
          <p className="text-xs text-red-500">
            {t('notification.blocked')}
          </p>
        )}

        <ToggleRow
          label={t('notification.sound')}
          checked={prefs.sound}
          onChange={(v) => updatePref('sound', v)}
          disabled={!isEnabled}
        />

        <ToggleRow
          label={t('notification.dm')}
          checked={prefs.dm}
          onChange={(v) => updatePref('dm', v)}
          disabled={!isEnabled}
        />

        <ToggleRow
          label={t('notification.mention')}
          checked={prefs.mention}
          onChange={(v) => updatePref('mention', v)}
          disabled={!isEnabled}
        />
      </div>
    </div>
  );
}
