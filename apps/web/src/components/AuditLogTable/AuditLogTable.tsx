'use client';

import { useState, useMemo } from 'react';
import type { ModerationAction } from '@zktalk/shared';

interface AuditLogTableProps {
  actions: ModerationAction[];
}

const PAGE_SIZE = 20;

const ACTION_TYPE_STYLES: Record<string, string> = {
  mute: 'bg-yellow-900/50 text-yellow-400',
  kick: 'bg-orange-900/50 text-orange-400',
  ban: 'bg-red-900/50 text-red-400',
  warn: 'bg-yellow-900/50 text-yellow-300',
  delete_message: 'bg-gray-700 text-gray-300',
  unmute: 'bg-green-900/50 text-green-400',
  unban: 'bg-green-900/50 text-green-400',
};

type SortField = 'createdAt' | 'actionType';
type SortDir = 'asc' | 'desc';

export function AuditLogTable({ actions }: AuditLogTableProps) {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...actions];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'actionType') {
        cmp = a.actionType.localeCompare(b.actionType);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [actions, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(0);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-600">&#8645;</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
  };

  if (actions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-8 text-center">
        <p className="text-sm text-gray-500">No moderation actions recorded.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50 text-left text-xs text-gray-400">
              <th
                className="cursor-pointer px-4 py-3 font-medium"
                onClick={() => toggleSort('createdAt')}
              >
                Date <SortIcon field="createdAt" />
              </th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th
                className="cursor-pointer px-4 py-3 font-medium"
                onClick={() => toggleSort('actionType')}
              >
                Action <SortIcon field="actionType" />
              </th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {paginated.map((action) => (
              <tr key={action.id} className="hover:bg-gray-800/30">
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                  {new Date(action.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {action.actorUserId}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ACTION_TYPE_STYLES[action.actionType] ??
                      'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {action.actionType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {action.targetUserId ?? action.targetMessageId ?? '-'}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                  {action.reason ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, sorted.length)} of{' '}
            {sorted.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
