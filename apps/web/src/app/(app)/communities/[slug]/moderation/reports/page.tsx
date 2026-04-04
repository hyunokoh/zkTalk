'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ReportCard } from '@/components/ReportCard';
import type { Community, Report } from '@zktalk/shared';

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

type StatusFilter = 'open' | 'resolved' | 'dismissed' | 'all';

export default function ReportsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', community?.id, statusFilter],
    queryFn: async () => {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api<{ reports: ReportRow[] }>(
        `/api/communities/${community!.id}/reports${qs}`,
      );
      return res.reports ?? [];
    },
    enabled: !!community,
  });

  const filters: { label: string; value: StatusFilter }[] = [
    { label: t('mod.open'), value: 'open' },
    { label: t('mod.resolved'), value: 'resolved' },
    { label: t('mod.dismissed'), value: 'dismissed' },
    { label: t('mod.all'), value: 'all' },
  ];

  return (
    <div className="p-6" data-testid="moderation-reports-page">
      <h1 className="text-xl font-bold">{t('mod.reports')}</h1>

      {/* Filters */}
      <div className="mt-4 flex gap-2" data-testid="moderation-reports-filters">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            data-testid={`moderation-reports-filter-${f.value}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Reports list */}
      <div className="mt-6 space-y-3" data-testid="moderation-reports-list">
        {isLoading ? (
          <p className="text-sm text-gray-500" data-testid="moderation-reports-loading">{t('mod.loadingReports')}</p>
        ) : reports.length === 0 ? (
          <div
            className="rounded-lg border border-gray-700 bg-gray-800/30 p-8 text-center"
            data-testid="moderation-reports-empty-state"
          >
            <p className="text-sm text-gray-500">
              {t('mod.noReports', { status: statusFilter === 'all' ? '' : statusFilter })}
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <ReportCard key={report.report.id} report={report} communityId={community!.id} />
          ))
        )}
      </div>
    </div>
  );
}
