'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Report } from '@zktalk/shared';

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

interface ReportCardProps {
  report: ReportRow;
  communityId: string;
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-orange-900/50 text-orange-400',
  resolved: 'bg-green-900/50 text-green-400',
  dismissed: 'bg-gray-700 text-gray-400',
};

export function ReportCard({ report, communityId }: ReportCardProps) {
  const queryClient = useQueryClient();
  const details = report.report;

  const updateReport = useMutation({
    mutationFn: (status: string) =>
      api(`/api/reports/${details.id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', communityId] });
    },
  });

  return (
    <div
      className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
      data-testid="report-card"
      data-report-id={details.id}
      data-report-status={details.status}
      data-message-id={details.messageId ?? ''}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLES[details.status] ?? STATUS_STYLES.open
              }`}
            >
              {details.status}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(details.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium text-gray-200">
              Reason: <span className="text-gray-300">{details.reasonCode}</span>
            </p>
            {details.reasonText && (
              <p className="mt-1 text-sm text-gray-400">{details.reasonText}</p>
            )}
            {report.message && (
              <p className="mt-1 text-sm text-gray-500">
                Message preview:{' '}
                <span className="text-gray-400">{report.message.bodyPlaintext}</span>
              </p>
            )}
          </div>

          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            {details.reportedUserId && (
              <span>
                Reported user:{' '}
                <span className="text-gray-400">{details.reportedUserId}</span>
              </span>
            )}
            {details.messageId && (
              <span>
                Message:{' '}
                <span className="text-gray-400">{details.messageId}</span>
              </span>
            )}
            <span>
              Reporter:{' '}
              <span className="text-gray-400">
                {report.reporter?.displayName ?? details.reporterUserId}
              </span>
            </span>
          </div>
        </div>

        {/* Actions */}
        {details.status === 'open' && (
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => updateReport.mutate('resolved')}
              disabled={updateReport.isPending}
              data-testid="report-resolve-button"
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              onClick={() => updateReport.mutate('dismissed')}
              disabled={updateReport.isPending}
              data-testid="report-dismiss-button"
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
