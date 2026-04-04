'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

const NAV_ITEMS = [
  { href: '/settings', labelKey: 'settings.overview' },
  { href: '/settings/privacy', labelKey: 'privacy.metadata' },
  { href: '/settings/backup', labelKey: 'backup.title' },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <nav className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 p-4">
        <div className="mb-5 rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
          <h2 className="text-base font-semibold text-white">{t('settings.title')}</h2>
          <p className="mt-2 text-xs leading-5 text-gray-400">{t('settings.listSubtitle')}</p>
        </div>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
