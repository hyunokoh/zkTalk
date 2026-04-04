'use client';

import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';
import type { ModerationAction } from '@zktalk/shared';

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

interface AuditLogTableProps {
  actions: AuditLogRow[];
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
        cmp = new Date(a.action.createdAt).getTime() - new Date(b.action.createdAt).getTime();
      } else if (sortField === 'actionType') {
        cmp = a.action.actionType.localeCompare(b.action.actionType);
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
      <div
        className="rounded-lg border border-gray-700 bg-gray-800/30 p-8 text-center"
        data-testid="audit-log-empty-state"
      >
        <p className="text-sm text-gray-500">{t('mod.noAuditEntries')}</p>
      </div>
    );
  }

  return (
    <div data-testid="audit-log-table-wrapper">
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm" data-testid="audit-log-table">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800/50 text-left text-xs text-gray-400">
              <th
                className="cursor-pointer px-4 py-3 font-medium"
                onClick={() => toggleSort('createdAt')}
              >
                {t('mod.date')} <SortIcon field="createdAt" />
              </th>
              <th className="px-4 py-3 font-medium">{t('mod.actor')}</th>
              <th
                className="cursor-pointer px-4 py-3 font-medium"
                onClick={() => toggleSort('actionType')}
              >
                {t('mod.action')} <SortIcon field="actionType" />
              </th>
              <th className="px-4 py-3 font-medium">{t('mod.target')}</th>
              <th className="px-4 py-3 font-medium">{t('mod.reason')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {paginated.map((action) => (
              <tr
                key={action.action.id}
                className="hover:bg-gray-800/30"
                data-testid="audit-log-row"
                data-action-id={action.action.id}
                data-action-type={action.action.actionType}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                  {new Date(action.action.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {action.actor.displayName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ACTION_TYPE_STYLES[action.action.actionType] ??
                      'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {action.action.actionType}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {action.action.targetUserId ?? action.action.targetMessageId ?? '-'}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-500">
                  {action.action.reason ?? action.message?.bodyPlaintext ?? '-'}
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
