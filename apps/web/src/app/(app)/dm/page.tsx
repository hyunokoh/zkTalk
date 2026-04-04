'use client';

import { useTranslation } from '@/lib/i18n';

export default function DmHomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('dm.selectOrStart')}
      </p>
    </div>
  );
}
