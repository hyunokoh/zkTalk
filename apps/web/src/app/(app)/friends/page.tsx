'use client';

import React, { Suspense } from 'react';
import { useTranslation } from '@/lib/i18n';
import { FriendList } from '@/components/FriendList';
import { ContactSync } from '@/components/ContactSync';

export default function FriendsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto" data-testid="friends-page">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold text-white">
          {t('friend.title')}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {t('friend.friendsPageHelp')}
        </p>

        {/* Contact-based friend suggestions */}
        <div className="mt-6">
          <ContactSync />
        </div>

        {/* Friends list */}
        <div className="mt-6">
          <Suspense fallback={<div className="text-sm text-fg-subtle">{t('common.loading')}</div>}>
            <FriendList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
