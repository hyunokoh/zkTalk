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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-bg-elevated p-6 shadow-2xl">
        {/* Welcome */}
        <h2 className="text-center text-2xl font-bold text-fg">
          {t('onboarding.welcome')}
        </h2>
        <p className="mt-1 text-center text-sm text-fg-muted">
          {communityName}
        </p>

        {/* Welcome message */}
        {onboarding.welcomeMessage && (
          <p className="mt-4 rounded-lg bg-bg-subtle p-3 text-sm text-fg-subtle">
            {onboarding.welcomeMessage}
          </p>
        )}

        {/* Rules */}
        {hasRules && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-fg-muted">
              {t('onboarding.rules')}
            </h3>
            <ul className="mt-2 space-y-1.5">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent-strong">
                    {i + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ul>

            <label className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="rounded border-line text-accent-strong focus:ring-accent"
              />
              {t('onboarding.acceptRules')}
            </label>
          </div>
        )}

        {starterChannels.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-fg-muted">
              {t('community.onboardingDefaultChannels')}
            </h3>
            <p className="mt-1 text-sm text-fg-subtle">
              {t('community.onboardingDefaultChannelsHint')}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">
              {t('community.onboardingDefaultChannelsPolicyHint')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starterChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => handleDone(channel.id)}
                  disabled={hasRules && !rulesAccepted}
                  className="rounded-full border border-accent-soft bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent-strong transition hover:border-accent-soft hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 dark:border-accent/30 dark:bg-accent/10 dark:text-accent dark:hover:bg-accent/20"
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
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-[color:var(--on-accent)] transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
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
              className="w-full rounded-lg border border-line py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-bg-subtle"
            >
              {t('onboarding.stayOnOverview')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
