'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { ProfileQR } from '@/components/ProfileQR';
import { ProfileEditor } from '@/components/ProfileEditor';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuthStore } from '@/stores/auth';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

      <section className="mt-6 rounded-[1.75rem] border border-gray-800 bg-gray-950/70 p-2">
        <Link
          href="/settings/ai"
          className="flex items-center justify-between rounded-[1.25rem] px-4 py-4 transition hover:bg-white/5"
        >
          <div>
            <p className="text-base font-semibold text-white">AI and translation</p>
            <p className="mt-1 text-sm text-gray-400">
              Set default incoming translation behavior. Manual Translate on each message stays
              available.
            </p>
          </div>
          <span className="text-lg text-gray-500">{'›'}</span>
        </Link>
        <Link
          href="/settings/privacy"
          className="flex items-center justify-between rounded-[1.25rem] px-4 py-4 transition hover:bg-white/5"
        >
          <div>
            <p className="text-base font-semibold text-white">{t('privacy.metadata')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('settings.cardSecurityBody')}</p>
          </div>
          <span className="text-lg text-gray-500">{'›'}</span>
        </Link>
        <Link
          href="/settings/backup"
          className="flex items-center justify-between rounded-[1.25rem] px-4 py-4 transition hover:bg-white/5"
        >
          <div>
            <p className="text-base font-semibold text-white">{t('backup.title')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('settings.cardDataBody')}</p>
          </div>
          <span className="text-lg text-gray-500">{'›'}</span>
        </Link>
        <Link
          href="/friends"
          className="flex items-center justify-between rounded-[1.25rem] px-4 py-4 transition hover:bg-white/5"
        >
          <div>
            <p className="text-base font-semibold text-white">{t('friend.title')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('settings.cardPeopleBody')}</p>
          </div>
          <span className="text-lg text-gray-500">{'›'}</span>
        </Link>
        <Link
          href="/settings#profile-share"
          className="flex items-center justify-between rounded-[1.25rem] px-4 py-4 transition hover:bg-white/5"
        >
          <div>
            <p className="text-base font-semibold text-white">{t('settings.profileShareTitle')}</p>
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
          className="flex w-full items-center justify-between rounded-[1.25rem] px-4 py-4 text-left transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <div>
            <p className="text-base font-semibold text-red-200">
              {isLoggingOut ? t('common.loading') : t('common.signOut')}
            </p>
          </div>
          <span className="text-lg text-red-300">{'›'}</span>
        </button>
      </section>

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
