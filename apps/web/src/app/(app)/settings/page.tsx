'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/lib/i18n';
import {
  buildDesktopLocalMachineLastCommandEntry,
  ensureDesktopLocalMachineBridgeOnline,
  readDesktopLocalMachineBridgeState,
} from '@/lib/local-machine-bridge-loopback';
import { getLocalMachineCommandCopyKey } from '@/lib/local-machine-command-copy';
import { ProfileQR } from '@/components/ProfileQR';
import { ProfileEditor } from '@/components/ProfileEditor';
import { UserAvatar } from '@/components/UserAvatar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { useAuthStore } from '@/stores/auth';
import { getSettingsSectionEntrypoint } from '@zktalk/shared';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: desktopBridgeSnapshot } = useQuery({
    queryKey: ['desktop-local-machine-bridge-settings', user?.id ?? null],
    queryFn: () =>
      user?.id
        ? ensureDesktopLocalMachineBridgeOnline({
            ownerUserId: user.id,
          })
        : readDesktopLocalMachineBridgeState(),
    staleTime: 1_000,
    refetchInterval: 5_000,
  });
  const desktopBridgeLastCommand = useMemo(
    () =>
      desktopBridgeSnapshot ? buildDesktopLocalMachineLastCommandEntry(desktopBridgeSnapshot) : null,
    [desktopBridgeSnapshot],
  );
  const desktopBridgeStatusLabel = useMemo(() => {
    const status = desktopBridgeSnapshot?.presence?.status ?? null;

    if (!desktopBridgeSnapshot?.registered || !desktopBridgeSnapshot.machine) {
      return t('settings.machineControlStatusUnavailable');
    }

    if (status === 'online' || status === 'busy') {
      return t('settings.machineControlStatusConnected');
    }

    if (status === 'auth_missing') {
      return t('settings.machineControlStatusNeedsAuth');
    }

    return t('settings.machineControlStatusAttention');
  }, [desktopBridgeSnapshot, t]);
  const desktopBridgeSummary = useMemo(() => {
    const status = desktopBridgeSnapshot?.presence?.status ?? null;
    const machineName = desktopBridgeSnapshot?.machine?.name ?? null;

    if (!desktopBridgeSnapshot?.registered || !machineName) {
      return t('settings.machineControlSummaryUnavailable');
    }

    if (status === 'auth_missing') {
      return t('settings.machineControlSummaryNeedsAuth', { machine: machineName });
    }

    if (status === 'busy') {
      return t('settings.machineControlSummaryBusy', { machine: machineName });
    }

    if (status === 'online') {
      return t('settings.machineControlSummaryConnected', { machine: machineName });
    }

    return t('settings.machineControlSummaryAttention', { machine: machineName });
  }, [desktopBridgeSnapshot, t]);
  const desktopBridgeAuthLabel = useMemo(() => {
    const authState =
      desktopBridgeSnapshot?.presence?.codexAuthState ?? desktopBridgeSnapshot?.machine?.codexAuthState;

    if (!desktopBridgeSnapshot?.registered || !desktopBridgeSnapshot?.machine) {
      return t('settings.machineControlAuthUnknown');
    }

    return authState === 'auth_present'
      ? t('settings.machineControlAuthReady')
      : t('settings.machineControlAuthMissing');
  }, [desktopBridgeSnapshot, t]);
  const desktopBridgeRecentState = useMemo(() => {
    if (!desktopBridgeLastCommand) {
      return t('settings.machineControlRecentEmpty');
    }

    const copy = t(
      getLocalMachineCommandCopyKey(
        desktopBridgeSnapshot?.lastCommand ?? {
          status: desktopBridgeLastCommand.status,
          errorCode: null,
        },
      ),
    );
    return desktopBridgeLastCommand.summary
      ? t('settings.machineControlRecentWithSummary', {
          state: copy,
          summary: desktopBridgeLastCommand.summary,
        })
      : t('settings.machineControlRecentStateOnly', { state: copy });
  }, [desktopBridgeLastCommand, desktopBridgeSnapshot?.lastCommand, t]);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div
        id="profile-edit"
        className="rounded-[1.75rem] border border-gray-800 bg-gray-950/80 p-5"
      >
        <div className="flex items-center gap-4">
          <div data-testid="settings-profile-avatar">
            <UserAvatar
              displayName={user?.displayName ?? '?'}
              avatarUrl={user?.avatarUrl ?? null}
              size="lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-white">
              {user?.displayName ?? t('settings.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-400">@{user?.username ?? 'unknown'}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {user?.bio?.trim() || t('profile.bioPlaceholder')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setProfileEditorOpen(true)}
            data-testid="settings-profile-edit-button"
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            {t('profile.edit')}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <section
          id="account"
          className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">{t('settings.accountSectionTitle')}</h2>
            <p className="mt-1 text-sm text-gray-400">
              {t('settings.accountSectionBody')}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-gray-800 bg-gray-950/50 p-2">
            <Link
              href="/friends"
              className="flex items-center justify-between rounded-[1rem] px-4 py-4 transition hover:bg-white/5"
            >
              <div>
                <p className="text-base font-semibold text-white">{t('friend.title')}</p>
                <p className="mt-1 text-sm text-gray-400">{t('settings.cardPeopleBody')}</p>
              </div>
              <span className="text-lg text-gray-500">{'›'}</span>
            </Link>
            <Link
              href="/settings#profile-share"
              className="flex items-center justify-between rounded-[1rem] px-4 py-4 transition hover:bg-white/5"
            >
              <div>
                <p className="text-base font-semibold text-white">
                  {t('settings.profileShareTitle')}
                </p>
                <p className="mt-1 text-sm text-gray-400">{t('settings.profileShareBody')}</p>
              </div>
              <span className="text-lg text-gray-500">{'›'}</span>
            </Link>
            <button
              type="button"
              data-testid="settings-signout-button"
              disabled={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                try {
                  await logout();
                  router.replace('/login');
                } finally {
                  setIsLoggingOut(false);
                }
              }}
              className="flex w-full items-center justify-between rounded-[1rem] px-4 py-4 text-left transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div>
                <p className="text-base font-semibold text-red-200">
                  {isLoggingOut ? t('common.loading') : t('common.signOut')}
                </p>
              </div>
              <span className="text-lg text-red-300">{'›'}</span>
            </button>
          </div>
        </section>

        <section
          id="notifications"
          className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
        >
          <h2 className="text-lg font-semibold text-white">
            {t('settings.notificationsSectionTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t('settings.notificationsSectionBody')}
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div
            id="language"
            className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
          >
            <h2 className="text-lg font-semibold text-white">
              {t('settings.languageSectionTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {t('settings.languageSectionBody')}
            </p>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>

          <div
            id="ai-translation"
            className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
          >
            <h2 className="text-lg font-semibold text-white">
              {t('settings.aiTranslationSectionTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {t('settings.aiTranslationSectionBody')}
            </p>
            <Link
              href={getSettingsSectionEntrypoint('ai_translation', 'web')}
              className="mt-4 inline-flex rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-gray-600 hover:bg-gray-800"
            >
              {t('settings.aiTranslationSectionAction')}
            </Link>
          </div>

          <div
            id="machine-control"
            className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
          >
            <h2 className="text-lg font-semibold text-white">
              {t('settings.machineControlSectionTitle')}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {t('settings.machineControlSectionBody')}
            </p>
            <div className="mt-4 rounded-[1.25rem] border border-gray-800 bg-gray-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {t('settings.machineControlSnapshotTitle')}
                </p>
                <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-200">
                  {desktopBridgeStatusLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-300">{desktopBridgeSummary}</p>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {t('settings.machineControlMachineLabel')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-200">
                    {desktopBridgeSnapshot?.machine?.name ?? t('settings.machineControlMachineUnavailable')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {t('settings.machineControlAuthLabel')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-200">{desktopBridgeAuthLabel}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                    {t('settings.machineControlRecentLabel')}
                  </dt>
                  <dd className="mt-1 text-xs leading-5 text-gray-400">{desktopBridgeRecentState}</dd>
                </div>
              </dl>
            </div>
            <Link
              href={getSettingsSectionEntrypoint('machine_control', 'web')}
              className="mt-4 inline-flex rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:border-gray-600 hover:bg-gray-800"
            >
              {t('settings.machineControlSectionAction')}
            </Link>
          </div>
        </section>

        <section
          id="data-privacy"
          className="rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
        >
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              {t('settings.dataPrivacySectionTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {t('settings.dataPrivacySectionBody')}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-gray-800 bg-gray-950/50 p-2">
            <Link
              href="/settings/privacy"
              className="flex items-center justify-between rounded-[1rem] px-4 py-4 transition hover:bg-white/5"
            >
              <div>
                <p className="text-base font-semibold text-white">{t('privacy.metadata')}</p>
                <p className="mt-1 text-sm text-gray-400">{t('settings.cardSecurityBody')}</p>
              </div>
              <span className="text-lg text-gray-500">{'›'}</span>
            </Link>
            <Link
              href="/settings/backup"
              className="flex items-center justify-between rounded-[1rem] px-4 py-4 transition hover:bg-white/5"
            >
              <div>
                <p className="text-base font-semibold text-white">{t('backup.title')}</p>
                <p className="mt-1 text-sm text-gray-400">{t('settings.cardDataBody')}</p>
              </div>
              <span className="text-lg text-gray-500">{'›'}</span>
            </Link>
          </div>
        </section>
      </div>

      <aside
        id="profile-share"
        className="mt-6 rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-5 scroll-mt-24"
      >
        <h2 className="text-lg font-semibold text-white">{t('settings.profileShareTitle')}</h2>
        <div className="mt-4">
          <ProfileQR hideHeading />
        </div>
      </aside>

      {profileEditorOpen ? <ProfileEditor onClose={() => setProfileEditorOpen(false)} /> : null}
    </div>
  );
}
