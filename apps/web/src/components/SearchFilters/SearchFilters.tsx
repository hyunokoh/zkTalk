'use client';

import { useState } from 'react';
import { t } from '@/lib/i18n';

export interface SearchFilterValues {
  channelId?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachment?: boolean;
}

interface SearchFiltersProps {
  channels: { id: string; name: string }[];
  filters: SearchFilterValues;
  onChange: (filters: SearchFilterValues) => void;
}

export function SearchFilters({ channels, filters, onChange }: SearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount = [
    filters.channelId,
    filters.author,
    filters.dateFrom,
    filters.dateTo,
    filters.hasAttachment,
  ].filter(Boolean).length;

  const update = (partial: Partial<SearchFilterValues>) => {
    onChange({ ...filters, ...partial });
  };

  const clearAll = () => {
    onChange({});
  };

  return (
    <div className="rounded-lg border border-line bg-bg-subtle/30">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm"
      >
        <span className="flex items-center gap-2 font-medium text-fg-muted">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          {t('search.filters')}
          {activeCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--on-accent)]">
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 text-fg-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Channel filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                {t('search.channel')}
              </label>
              <select
                value={filters.channelId ?? ''}
                onChange={(e) =>
                  update({ channelId: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted focus:border-accent focus:outline-none"
              >
                <option value="">{t('search.allChannels')}</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    # {ch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Author filter */}
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                {t('search.author')}
              </label>
              <input
                type="text"
                value={filters.author ?? ''}
                onChange={(e) =>
                  update({ author: e.target.value || undefined })
                }
                placeholder={t('search.authorPlaceholder')}
                className="w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder:text-fg focus:border-accent focus:outline-none"
              />
            </div>

            {/* Date from */}
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                {t('search.dateFrom')}
              </label>
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) =>
                  update({ dateFrom: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">
                {t('search.dateTo')}
              </label>
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) =>
                  update({ dateTo: e.target.value || undefined })
                }
                className="w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Has attachment */}
          <label className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              checked={filters.hasAttachment ?? false}
              onChange={(e) =>
                update({
                  hasAttachment: e.target.checked || undefined,
                })
              }
              className="rounded border-line bg-bg-subtle text-accent-strong focus:ring-accent"
            />
            {t('search.hasAttachment')}
          </label>

          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="mt-4 text-xs text-accent hover:underline"
            >
              {t('search.clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
