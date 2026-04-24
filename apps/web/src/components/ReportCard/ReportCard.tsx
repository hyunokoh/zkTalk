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
  open: 'bg-warning/50 text-warning',
  resolved: 'bg-success/50 text-success',
  dismissed: 'bg-bg-subtle text-fg-muted',
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
      className="rounded-lg border border-line bg-bg-subtle/50 p-4"
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
            <span className="text-xs text-fg-muted">
              {new Date(details.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm font-medium text-fg-muted">
              Reason: <span className="text-fg-muted">{details.reasonCode}</span>
            </p>
            {details.reasonText && (
              <p className="mt-1 text-sm text-fg-muted">{details.reasonText}</p>
            )}
            {report.message && (
              <p className="mt-1 text-sm text-fg-muted">
                Message preview:{' '}
                <span className="text-fg-muted">{report.message.bodyPlaintext}</span>
              </p>
            )}
          </div>

          <div className="mt-2 flex gap-4 text-xs text-fg-muted">
            {details.reportedUserId && (
              <span>
                Reported user:{' '}
                <span className="text-fg-muted">{details.reportedUserId}</span>
              </span>
            )}
            {details.messageId && (
              <span>
                Message:{' '}
                <span className="text-fg-muted">{details.messageId}</span>
              </span>
            )}
            <span>
              Reporter:{' '}
              <span className="text-fg-muted">
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
              className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-success/85 disabled:opacity-50"
            >
              Resolve
            </button>
            <button
              onClick={() => updateReport.mutate('dismissed')}
              disabled={updateReport.isPending}
              data-testid="report-dismiss-button"
              className="rounded-lg bg-bg-subtle px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-hover disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
