'use client';

import Link from 'next/link';
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
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-gray-700 bg-gray-800/30 p-4">
            <div className="h-3 w-24 rounded bg-gray-700" />
            <div className="mt-2 h-4 w-3/4 rounded bg-gray-700" />
            <div className="mt-1 h-3 w-1/2 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (!query.trim()) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <p className="mt-3 text-sm text-gray-500">
          {t('search.enterTerm')}
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-12 text-center">
        <p className="text-sm text-gray-500">
          No results found for &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>
      {results.map((result) => (
        <Link
          key={result.id}
          href={`/communities/${result.communitySlug}/channels/${result.channelId}#${result.id}`}
          className="block rounded-lg border border-gray-700 bg-gray-800/30 p-4 transition-colors hover:border-gray-600 hover:bg-gray-800/50"
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
