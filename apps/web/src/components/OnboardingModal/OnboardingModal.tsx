'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface StarterChannel {
  id: string;
  name: string;
}

interface OnboardingData {
  id: string;
  communityId: string;
  welcomeMessage: string | null;
  rules: string | null; // JSON array of strings
  defaultChannelIds: string | null; // JSON array
  isEnabled: boolean;
}

interface OnboardingModalProps {
  communityId: string;
  communityName: string;
  onboarding: OnboardingData;
  starterChannels?: StarterChannel[];
  onClose: (targetChannelId?: string) => void;
}

export function OnboardingModal({
  communityId,
  communityName,
  onboarding,
  starterChannels = [],
  onClose,
}: OnboardingModalProps) {
  const { t } = useTranslation();
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const rules: string[] = onboarding.rules ? JSON.parse(onboarding.rules) : [];
  const hasRules = rules.length > 0;
  const primaryStarterChannel = starterChannels[0] ?? null;

  const handleDone = (targetChannelId?: string) => {
    localStorage.setItem(`onboarding_seen_${communityId}`, 'true');
    onClose(targetChannelId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        {/* Welcome */}
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('onboarding.welcome')}
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {communityName}
        </p>

        {/* Welcome message */}
        {onboarding.welcomeMessage && (
          <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {onboarding.welcomeMessage}
          </p>
        )}

        {/* Rules */}
        {hasRules && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('onboarding.rules')}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ul>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {t('onboarding.acceptRules')}
            </label>
          </div>
        )}

        {starterChannels.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('community.onboardingDefaultChannels')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('community.onboardingDefaultChannelsHint')}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('community.onboardingDefaultChannelsPolicyHint')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starterChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleDone(channel.id)}
                  disabled={hasRules && !rulesAccepted}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                >
                  # {channel.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-2">
          <button
            onClick={() => handleDone(primaryStarterChannel?.id)}
            disabled={hasRules && !rulesAccepted}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryStarterChannel
              ? t('onboarding.openChannel', { channel: primaryStarterChannel.name })
              : t('onboarding.done')}
          </button>
          {primaryStarterChannel && (
            <button
              type="button"
              onClick={() => handleDone()}
              disabled={hasRules && !rulesAccepted}
              className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('onboarding.stayOnOverview')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
