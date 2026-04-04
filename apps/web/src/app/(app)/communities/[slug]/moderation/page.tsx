'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import type { Community, Report, ModerationAction } from '@zktalk/shared';

interface ReportRow {
  report: Report;
  message: {
    id: string;
    channelId: string;
    authorUserId: string;
    bodyPlaintext: string;
    isDeleted: boolean;
    isEncrypted: boolean;
  } | null;
  reporter: {
    id: string;
    displayName: string;
    username: string;
  } | null;
}

interface AuditLogRow {
  action: ModerationAction;
  actor: {
    id: string;
    displayName: string;
    username: string;
  };
  message: {
    id: string;
    channelId: string;
    bodyPlaintext: string;
    isDeleted: boolean;
    isEncrypted: boolean;
  } | null;
}

export default function ModerationOverviewPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });
  const { canManageModeration, isAdmin, isLoading: roleLoading } = useCommunityRole(
    community?.id,
  );

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', community?.id, 'open'],
    queryFn: async () => {
      const res = await api<{ reports: ReportRow[] }>(
        `/api/communities/${community!.id}/reports?status=open`,
      );
      return res.reports ?? [];
    },
    enabled: !!community,
  });

  const { data: recentActions = [] } = useQuery({
    queryKey: ['audit-log', community?.id, 'recent'],
    queryFn: async () => {
      const res = await api<{ actions: AuditLogRow[] }>(
        `/api/communities/${community!.id}/audit-log?limit=5`,
      );
      return res.actions ?? [];
    },
    enabled: !!community && isAdmin,
  });

  const basePath = `/communities/${slug}/moderation`;

  if (communityLoading || !community || roleLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!canManageModeration) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        data-testid="moderation-overview-access-denied"
      >
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-300">{t('mod.accessDenied')}</h2>
          <p className="mt-2 text-sm text-gray-500">{t('mod.noPermission')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="moderation-overview-page">
      <h1 className="text-xl font-bold">{t('mod.moderationOverview')}</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
          data-testid="moderation-overview-open-reports-card"
        >
          <p className="text-sm text-gray-400">{t('mod.openReports')}</p>
          <p className="mt-1 text-3xl font-bold text-orange-400">
            {reports.length}
          </p>
          <Link
            href={`${basePath}/reports`}
            className="mt-2 inline-block text-xs text-indigo-400 hover:underline"
          >
            {t('mod.viewAllReports')}
          </Link>
        </div>
        <div
          className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
          data-testid="moderation-overview-recent-actions-card"
          data-access={isAdmin ? 'granted' : 'restricted'}
        >
          <p className="text-sm text-gray-400">{t('mod.recentActions')}</p>
          {isAdmin ? (
            <>
              <p className="mt-1 text-3xl font-bold text-gray-200">
                {recentActions.length}
              </p>
              <Link
                href={`${basePath}/audit-log`}
                className="mt-2 inline-block text-xs text-indigo-400 hover:underline"
              >
                {t('mod.viewAuditLog')}
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-500">{t('mod.noPermission')}</p>
          )}
        </div>
        <div
          className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
          data-testid="moderation-overview-status-card"
        >
          <p className="text-sm text-gray-400">{t('mod.status')}</p>
          <p className="mt-1 text-lg font-semibold text-green-400">
            {reports.length === 0 ? t('mod.allClear') : t('mod.needsAttention')}
          </p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="mt-8" data-testid="moderation-overview-recent-actions">
        <h2 className="text-lg font-semibold text-gray-300">{t('mod.recentActions')}</h2>
        {!isAdmin ? (
          <p className="mt-4 text-sm text-gray-500">{t('mod.noPermission')}</p>
        ) : recentActions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {t('mod.noActions')}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentActions.map((action) => (
              <div
                key={action.action.id}
                className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-3"
              >
                <ActionTypeBadge actionType={action.action.actionType} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-300">
                    {action.action.actionType}
                    {action.action.reason && (
                      <span className="text-gray-500"> &mdash; {action.action.reason}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(action.action.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionTypeBadge({ actionType }: { actionType: string }) {
  let colorClasses = 'bg-gray-700 text-gray-300';
  if (actionType === 'mute') colorClasses = 'bg-yellow-900/50 text-yellow-400';
  else if (actionType === 'kick') colorClasses = 'bg-orange-900/50 text-orange-400';
  else if (actionType === 'ban') colorClasses = 'bg-red-900/50 text-red-400';
  else if (actionType === 'warn') colorClasses = 'bg-yellow-900/50 text-yellow-300';
  else if (actionType === 'delete_message') colorClasses = 'bg-gray-700 text-gray-300';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}>
      {actionType}
    </span>
  );
}
