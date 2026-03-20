'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { SearchFilters } from '@/components/SearchFilters';
import type { SearchResult } from '@/components/SearchResults';
import type { SearchFilterValues } from '@/components/SearchFilters';
import type { Community, Channel } from '@zktalk/shared';

export default function SearchPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilterValues>({});

  const { data: community } = useQuery({
    queryKey: ['community', slug],
    queryFn: () => api<Community>(`/api/communities/${slug}`),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', community?.id],
    queryFn: () => api<Channel[]>(`/api/communities/${community!.id}/channels`),
    enabled: !!community,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', community?.id, query, filters],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      searchParams.set('q', query);
      searchParams.set('communityId', community!.id);
      if (filters.channelId) searchParams.set('channelId', filters.channelId);
      if (filters.author) searchParams.set('author', filters.author);
      if (filters.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) searchParams.set('dateTo', filters.dateTo);
      if (filters.hasAttachment) searchParams.set('hasAttachment', 'true');

      return api<SearchResult[]>(
        `/api/search/messages?${searchParams.toString()}`,
      );
    },
    enabled: !!community && query.trim().length > 0,
  });

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return (
    <div className="flex flex-1 flex-col p-6">
      <h1 className="text-xl font-bold">Search</h1>

      <div className="mt-4 max-w-2xl">
        <SearchBar onSearch={handleSearch} placeholder="Search messages..." />
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
          results={results.map((r) => ({ ...r, communitySlug: slug }))}
          isLoading={isLoading}
          query={query}
        />
      </div>
    </div>
  );
}
