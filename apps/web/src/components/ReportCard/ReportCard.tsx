'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Report } from '@zktalk/shared';

interface ReportCardProps {
  report: Report;
  communityId: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-orange-900/50 text-orange-400',
  resolved: 'bg-green-900/50 text-green-400',
  dismissed: 'bg-gray-700 text-gray-400',
};

export function ReportCard({ report, communityId }: ReportCardProps) {
  const queryClient = useQueryClient();

  const updateReport = useMutation({
    mutationFn: (status: string) =>
      api(`/api/reports/${report.id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', communityId] });
    },
  });

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLES[report.status] ?? STATUS_STYLES.open
              }`}
            >
              {report.status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(report.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium text-gray-200">
              Reason: <span className="text-gray-300">{report.reasonCode}</span>
            </p>
            {report.reasonText && (
              <p className="mt-1 text-sm text-gray-400">{report.reasonText}</p>
            )}
          </div>

          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {report.reportedUserId && (
              <span>
                Reported user:{' '}
                <span className="text-gray-400">{report.reportedUserId}</span>
              </span>
            )}
            {report.messageId && (
              <span>
                Message:{' '}
                <span className="text-gray-400">{report.messageId}</span>
              </span>
            )}
            <span>
              Reporter:{' '}
              <span className="text-gray-400">{report.reporterUserId}</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        {report.status === 'open' && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => updateReport.mutate('resolved')}
              disabled={updateReport.isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              onClick={() => updateReport.mutate('dismissed')}
              disabled={updateReport.isPending}
              className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
