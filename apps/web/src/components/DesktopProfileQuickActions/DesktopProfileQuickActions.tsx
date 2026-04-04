'use client';

import React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { buildSharedProfileHref, parseSharedProfileText } from '@/lib/shared-profile';

interface DesktopProfileQuickActionsProps {
  compact?: boolean;
}

export function DesktopProfileQuickActions({
  compact = false,
}: DesktopProfileQuickActionsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState('');

  const handlePasteProfile = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      setFeedback(t('friend.sharedProfileClipboardError'));
      return;
    }

    try {
      const clipboardValue = await navigator.clipboard.readText();
      const profile = parseSharedProfileText(clipboardValue);
      if (!profile) {
        setFeedback(t('friend.sharedProfileParseError'));
        return;
      }
      setFeedback('');
      router.push(buildSharedProfileHref(profile, searchParams));
    } catch {
      setFeedback(t('friend.sharedProfileClipboardError'));
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handlePasteProfile()}
          className="rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-800"
        >
          {t('app.desktopPasteProfile')}
        </button>
        <Link
          href="/settings#profile-share"
          className="rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-800"
        >
          {t('app.desktopShareProfile')}
        </Link>
        {feedback ? <p className="max-w-56 text-xs text-amber-300">{feedback}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {t('app.desktopPasteProfile')}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-400">
        {t('app.desktopPasteProfileHint')}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handlePasteProfile()}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          {t('friend.sharedProfilePaste')}
        </button>
        <Link
          href="/friends"
          className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
        >
          {t('settings.openFriends')}
        </Link>
        <Link
          href="/settings#profile-share"
          className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
        >
          {t('app.desktopShareProfile')}
        </Link>
      </div>
      {feedback ? <p className="mt-3 text-xs text-amber-300">{feedback}</p> : null}
    </div>
  );
}
