'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { ProfileQR } from '@/components/ProfileQR';
import { ProfileEditor } from '@/components/ProfileEditor';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuthStore } from '@/stores/auth';

export default function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
        <section>
          <div
            id="profile-edit"
            className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div data-testid="settings-profile-avatar">
                  <UserAvatar
                    displayName={user?.displayName ?? '?'}
                    avatarUrl={user?.avatarUrl ?? null}
                    size="lg"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {user?.displayName ?? t('settings.title')}
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    @{user?.username ?? 'unknown'}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                    {user?.bio?.trim() || t('profile.bioPlaceholder')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setProfileEditorOpen(true)}
                  data-testid="settings-profile-edit-button"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  {t('profile.edit')}
                </button>
                <Link
                  href="/settings#profile-share"
                  className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
                >
                  {t('settings.profileShareTitle')}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link
              href="/settings/privacy"
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 transition hover:border-gray-700 hover:bg-gray-950"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                {t('settings.cardSecurity')}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{t('privacy.metadata')}</h2>
              <p className="mt-2 text-sm text-gray-400">{t('settings.cardSecurityBody')}</p>
            </Link>

            <Link
              href="/settings/backup"
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 transition hover:border-gray-700 hover:bg-gray-950"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                {t('settings.cardData')}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{t('backup.title')}</h2>
              <p className="mt-2 text-sm text-gray-400">{t('settings.cardDataBody')}</p>
            </Link>

            <Link
              href="/friends"
              className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4 transition hover:border-gray-700 hover:bg-gray-950"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                {t('settings.cardPeople')}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">{t('friend.title')}</h2>
              <p className="mt-2 text-sm text-gray-400">{t('settings.cardPeopleBody')}</p>
            </Link>
          </div>
        </section>

        <aside id="profile-share" className="rounded-3xl border border-gray-800 bg-gray-900/80 p-6 scroll-mt-24">
          <h2 className="text-lg font-semibold text-white">
            {t('settings.profileShareTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {t('settings.profileShareBody')}
          </p>
          <div className="mt-5">
            <ProfileQR hideHeading />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/friends"
              className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
            >
              {t('settings.openFriends')}
            </Link>
            <Link
              href="/home"
              className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
            >
              {t('settings.goHome')}
            </Link>
          </div>
        </aside>
      </div>

      {profileEditorOpen ? <ProfileEditor onClose={() => setProfileEditorOpen(false)} /> : null}
    </div>
  );
}
