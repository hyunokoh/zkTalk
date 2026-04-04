'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import type { Community } from '@zktalk/shared';

interface MemberRole {
  roleName: string;
}

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;
  const user = useAuthStore((s) => s.user);

  const NAV_ITEMS = [
    { label: t('mod.overview'), href: '' },
    { label: t('mod.reports'), href: '/reports' },
    { label: t('mod.auditLog'), href: '/audit-log' },
  ];

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: memberRole, isLoading: roleLoading } = useQuery({
    queryKey: ['member-role', community?.id, user?.id],
    queryFn: () =>
      api<MemberRole>(
        `/api/communities/${community!.id}/members/${user!.id}/role`,
      ),
    enabled: !!community && !!user,
  });

  if (roleLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  const allowedRoles = ['owner', 'admin', 'moderator'];
  if (memberRole && !allowedRoles.includes(memberRole.roleName)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-300">{t('mod.accessDenied')}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {t('mod.noPermission')}
          </p>
          <Link
            href={`/communities/${slug}`}
            className="mt-4 inline-block text-sm text-indigo-400 hover:underline"
          >
            {t('mod.backToCommunity')}
          </Link>
        </div>
      </div>
    );
  }

  const basePath = `/communities/${slug}/moderation`;
  const visibleNavItems =
    memberRole?.roleName === 'moderator'
      ? NAV_ITEMS.filter((item) => item.href !== '/audit-log')
      : NAV_ITEMS;

  return (
    <div className="flex flex-1 overflow-hidden" data-testid="moderation-layout">
      {/* Moderation sidebar */}
      <aside className="flex w-56 flex-col border-r border-gray-700 bg-gray-900" data-testid="moderation-sidebar">
        <div className="border-b border-gray-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-300">{t('mod.title')}</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-2" data-testid="moderation-nav">
          {visibleNavItems.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive =
              item.href === ''
                ? pathname === basePath
                : pathname.startsWith(href);
            const navKey = item.href === '' ? 'overview' : item.href.slice(1);
            return (
              <Link
                key={item.label}
                href={href}
                data-testid={`moderation-nav-${navKey}`}
                className={`block rounded px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
