'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Community, Report, ModerationAction } from '@zktalk/shared';

interface ModerationOverview {
  openReports: number;
  recentActions: ModerationAction[];
}

export default function ModerationOverviewPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', community?.id, 'open'],
    queryFn: () =>
      api<Report[]>(
        `/api/communities/${community!.id}/reports?status=open`,
      ),
    enabled: !!community,
  });

  const { data: recentActions = [] } = useQuery({
    queryKey: ['audit-log', community?.id, 'recent'],
    queryFn: () =>
      api<ModerationAction[]>(
        `/api/communities/${community!.id}/audit-log?limit=5`,
      ),
    enabled: !!community,
  });

  const basePath = `/communities/${slug}/moderation`;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Moderation Overview</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Open Reports</p>
          <p className="mt-1 text-3xl font-bold text-orange-400">
            {reports.length}
          </p>
          <Link
            href={`${basePath}/reports`}
            className="mt-2 inline-block text-xs text-indigo-400 hover:underline"
          >
            View all reports
          </Link>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Recent Actions</p>
          <p className="mt-1 text-3xl font-bold text-gray-200">
            {recentActions.length}
          </p>
          <Link
            href={`${basePath}/audit-log`}
            className="mt-2 inline-block text-xs text-indigo-400 hover:underline"
          >
            View audit log
          </Link>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <p className="text-sm text-gray-400">Status</p>
          <p className="mt-1 text-lg font-semibold text-green-400">
            {reports.length === 0 ? 'All clear' : 'Needs attention'}
          </p>
        </div>
      </div>

      {/* Recent Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-300">Recent Actions</h2>
        {recentActions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No moderation actions taken yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/30 px-4 py-3"
              >
                <ActionTypeBadge actionType={action.actionType} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-300">
                    {action.actionType}
                    {action.reason && (
                      <span className="text-gray-500"> &mdash; {action.reason}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(action.createdAt).toLocaleString()}
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
