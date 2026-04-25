'use client';

import React, { Suspense } from 'react';
import { useTranslation } from '@/lib/i18n';
import { FriendList } from '@/components/FriendList';
import { ContactSync } from '@/components/ContactSync';
import { FriendImport } from '@/components/FriendImport';

export default function FriendsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto" data-testid="friends-page">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold text-fg">
          {t('friend.title')}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {t('friend.friendsPageHelp')}
        </p>

        {/* Contact-based friend suggestions */}
        <div className="mt-6">
          <ContactSync />
        </div>

        {/* File import (vCard / CSV) */}
        <div className="mt-4">
          <FriendImport />
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
