'use client';

import { useTranslation } from '@/lib/i18n';

export default function DmHomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <p className="text-sm text-fg-muted dark:text-fg-muted">
        {t('dm.selectOrStart')}
      </p>
    </div>
  );
}
