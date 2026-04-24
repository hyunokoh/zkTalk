'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import { AuditLogTable } from '@/components/AuditLogTable';
import type { Community, ModerationAction } from '@zktalk/shared';

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

export default function AuditLogPage() {
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
  const { isAdmin, canManageModeration, isLoading: roleLoading } = useCommunityRole(
    community?.id,
  );

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['audit-log', community?.id],
    queryFn: async () => {
      const res = await api<{ actions: AuditLogRow[] }>(
        `/api/communities/${community!.id}/audit-log`,
      );
      return res.actions ?? [];
    },
    enabled: !!community && isAdmin,
  });

  if (communityLoading || !community || roleLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-fg-muted">{t('common.loading')}</div>
      </div>
    );
  }

  if (!canManageModeration || !isAdmin) {
    return (
      <div className="p-6" data-testid="moderation-audit-log-access-denied">
        <h1 className="text-xl font-bold">{t('mod.auditLog')}</h1>
        <div className="mt-6 rounded-lg border border-line bg-bg-subtle/30 p-6 text-sm text-fg-muted">
          {t('mod.noPermission')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="moderation-audit-log-page">
      <h1 className="text-xl font-bold">{t('mod.auditLog')}</h1>
      <div className="mt-6" data-testid="moderation-audit-log-content">
        {isLoading ? (
          <p className="text-sm text-fg-muted" data-testid="moderation-audit-log-loading">{t('mod.loadingAuditLog')}</p>
        ) : (
          <AuditLogTable actions={actions} />
        )}
      </div>
    </div>
  );
}
