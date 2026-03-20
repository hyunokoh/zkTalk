'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ReportCard } from '@/components/ReportCard';
import type { Community, Report } from '@zktalk/shared';

type StatusFilter = 'open' | 'resolved' | 'dismissed' | 'all';

export default function ReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', community?.id, statusFilter],
    queryFn: () => {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      return api<Report[]>(
        `/api/communities/${community!.id}/reports${qs}`,
      );
    },
    enabled: !!community,
  });

  const filters: { label: string; value: StatusFilter }[] = [
    { label: 'Open', value: 'open' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Dismissed', value: 'dismissed' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Reports</h1>

      {/* Filters */}
      <div className="mt-4 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
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
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading reports...</p>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-8 text-center">
            <p className="text-sm text-gray-500">
              No {statusFilter === 'all' ? '' : statusFilter} reports found.
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <ReportCard key={report.id} report={report} communityId={community!.id} />
          ))
        )}
      </div>
    </div>
  );
}
