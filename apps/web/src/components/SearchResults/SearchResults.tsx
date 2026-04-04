'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { t } from '@/lib/i18n';

export interface SearchResult {
  id: string;
  channelId: string;
  channelName: string;
  authorDisplayName: string;
  bodyPlaintext: string;
  createdAt: string;
  communitySlug: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded bg-yellow-500/30 px-0.5 text-yellow-200">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
  return date.toLocaleDateString();
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  if (isLoading) {
    return <LoadingState message={t('common.loading')} compact />;
  }

  if (!query.trim()) {
    return <EmptyState title={t('search.enterTerm')} />;
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title={`${t('search.noResults')} “${query}”`}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        {results.length === 1
          ? t('search.resultCount', { count: results.length })
          : t('search.resultCountPlural', { count: results.length })}
      </p>
      {results.map((result) => (
        <Link
          key={result.id}
          href={`/communities/${result.communitySlug}/channels/${result.channelId}#${result.id}`}
          className="block rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,28,42,0.98),rgba(11,18,29,0.98))] p-4 transition hover:border-white/12 hover:bg-white/[0.04]"
        >
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-gray-400"># {result.channelName}</span>
            <span>&middot;</span>
            <span>{result.authorDisplayName}</span>
            <span>&middot;</span>
            <span>{formatRelativeTime(result.createdAt)}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm text-gray-300">
            {highlightMatch(result.bodyPlaintext, query)}
          </p>
        </Link>
      ))}
    </div>
  );
}
