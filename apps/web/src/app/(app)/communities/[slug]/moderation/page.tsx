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
        <div className="text-fg-muted">{t('common.loading')}</div>
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
          <h2 className="text-xl font-bold text-fg-muted">{t('mod.accessDenied')}</h2>
          <p className="mt-2 text-sm text-fg-muted">{t('mod.noPermission')}</p>
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
          className="rounded-lg border border-line bg-bg-subtle/50 p-4"
          data-testid="moderation-overview-open-reports-card"
        >
          <p className="text-sm text-fg-muted">{t('mod.openReports')}</p>
          <p className="mt-1 text-3xl font-bold text-warning">
            {reports.length}
          </p>
          <Link
            href={`${basePath}/reports`}
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            {t('mod.viewAllReports')}
          </Link>
        </div>
        <div
          className="rounded-lg border border-line bg-bg-subtle/50 p-4"
          data-testid="moderation-overview-recent-actions-card"
          data-access={isAdmin ? 'granted' : 'restricted'}
        >
          <p className="text-sm text-fg-muted">{t('mod.recentActions')}</p>
          {isAdmin ? (
            <>
              <p className="mt-1 text-3xl font-bold text-fg-muted">
                {recentActions.length}
              </p>
              <Link
                href={`${basePath}/audit-log`}
                className="mt-2 inline-block text-xs text-accent hover:underline"
              >
                {t('mod.viewAuditLog')}
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">{t('mod.noPermission')}</p>
          )}
        </div>
        <div
          className="rounded-lg border border-line bg-bg-subtle/50 p-4"
          data-testid="moderation-overview-status-card"
        >
          <p className="text-sm text-fg-muted">{t('mod.status')}</p>
          <p className="mt-1 text-lg font-semibold text-success">
            {reports.length === 0 ? t('mod.allClear') : t('mod.needsAttention')}
          </p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="mt-8" data-testid="moderation-overview-recent-actions">
        <h2 className="text-lg font-semibold text-fg-muted">{t('mod.recentActions')}</h2>
        {!isAdmin ? (
          <p className="mt-4 text-sm text-fg-muted">{t('mod.noPermission')}</p>
        ) : recentActions.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">
            {t('mod.noActions')}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentActions.map((action) => (
              <div
                key={action.action.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-bg-subtle/30 px-4 py-3"
              >
                <ActionTypeBadge actionType={action.action.actionType} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg-muted">
                    {action.action.actionType}
                    {action.action.reason && (
                      <span className="text-fg-muted"> &mdash; {action.action.reason}</span>
                    )}
                  </p>
                  <p className="text-xs text-fg-muted">
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
  let colorClasses = 'bg-bg-subtle text-fg-muted';
  if (actionType === 'mute') colorClasses = 'bg-warning/50 text-warning';
  else if (actionType === 'kick') colorClasses = 'bg-warning/50 text-warning';
  else if (actionType === 'ban') colorClasses = 'bg-danger/50 text-danger';
  else if (actionType === 'warn') colorClasses = 'bg-warning/50 text-warning';
  else if (actionType === 'delete_message') colorClasses = 'bg-bg-subtle text-fg-muted';

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}>
      {actionType}
    </span>
  );
}
