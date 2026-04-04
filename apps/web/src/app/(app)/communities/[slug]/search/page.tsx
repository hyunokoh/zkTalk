'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { SearchFilters } from '@/components/SearchFilters';
import type { SearchResult } from '@/components/SearchResults';
import type { SearchFilterValues } from '@/components/SearchFilters';
import type { Community, Channel } from '@zktalk/shared';

interface SearchMessageRow {
  message: {
    id: string;
    channelId: string;
    bodyPlaintext: string;
    createdAt: string;
  };
  author: {
    displayName: string;
  };
  channel: {
    name: string;
  };
}

function toSearchDateTime(value: string, boundary: 'start' | 'end') {
  const time = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
  return `${value}${time}`;
}

export default function SearchPage() {
  const { t } = useTranslation();
  const params = useParams();
  const slug = params.slug as string;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilterValues>({});

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { data: channelData } = useQuery({
    queryKey: ['channels', community?.id],
    queryFn: () => api<{ uncategorized: Channel[]; categories: { category: unknown; channels: Channel[] }[] }>(`/api/communities/${community!.id}/channels`),
    enabled: !!community,
  });

  const channels = [
    ...(channelData?.uncategorized ?? []),
    ...(channelData?.categories?.flatMap((c) => c.channels) ?? []),
  ];

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', community?.id, query, filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      searchParams.set('communityId', community!.id);
      if (filters.channelId) searchParams.set('channelId', filters.channelId);
      if (filters.author) searchParams.set('author', filters.author);
      if (filters.dateFrom) searchParams.set('dateFrom', toSearchDateTime(filters.dateFrom, 'start'));
      if (filters.dateTo) searchParams.set('dateTo', toSearchDateTime(filters.dateTo, 'end'));
      if (filters.hasAttachment) searchParams.set('hasAttachment', 'true');

      const res = await api<{ messages: SearchMessageRow[] }>(
        `/api/search/messages?${searchParams.toString()}`,
      );

      return (res.messages ?? []).map((row) => ({
        id: row.message.id,
        channelId: row.message.channelId,
        channelName: row.channel.name,
        authorDisplayName: row.author.displayName,
        bodyPlaintext: row.message.bodyPlaintext,
        createdAt: row.message.createdAt,
        communitySlug: slug,
      })) satisfies SearchResult[];
    },
    enabled: !!community && query.trim().length > 0,
  });

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">{t('search.title')}</h1>

      <div className="mt-4 max-w-2xl">
        <SearchBar onSearch={handleSearch} placeholder={t('search.placeholder')} />
      </div>

      <div className="mt-4 max-w-2xl">
        <SearchFilters
          channels={channels.map((c) => ({ id: c.id, name: c.name }))}
          filters={filters}
          onChange={setFilters}
        />
      </div>

      <div className="mt-6 max-w-2xl">
        <SearchResults
          results={results}
          isLoading={isLoading}
          query={query}
        />
      </div>
    </div>
  );
}
