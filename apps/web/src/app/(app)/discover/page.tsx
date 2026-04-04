'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { api, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { resolveImageRenderProps } from '@/lib/image-optimization';

type DiscoverCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  visibility: string;
  createdAt: string;
  memberCount: number;
};

export default function DiscoverPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'members' | 'newest'>('members');
  const [feedback, setFeedback] = useState('');

  const trimmedQuery = query.trim();

  const discoverQuery = useQuery({
    queryKey: ['discover-communities', trimmedQuery, sort],
    queryFn: async () => {
      const params = new URLSearchParams({ sort, limit: '24' });
      if (trimmedQuery) {
        params.set('q', trimmedQuery);
      }
      const res = await api<{ communities: DiscoverCommunity[] }>(`/api/discover?${params.toString()}`);
      return res.communities ?? [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (community: DiscoverCommunity) => {
      await api(`/api/communities/${community.slug}/join`, {
        method: 'POST',
        body: {},
      });
      return community;
    },
    onSuccess: async (community) => {
      setFeedback('');
      await queryClient.invalidateQueries({ queryKey: ['communities'] });
      window.location.href = `/communities/${community.slug}`;
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFeedback(error.message);
        return;
      }
      setFeedback(t('invite.error'));
    },
  });

  const communities = useMemo(() => discoverQuery.data ?? [], [discoverQuery.data]);

  return (
    <div className="flex-1 overflow-y-auto" data-testid="discover-page">
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{t('discover.title')}</h1>
            <p className="mt-1 text-sm text-[#96989d]">{t('discover.listSubtitle')}</p>
          </div>
          <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setFeedback('');
              }}
              placeholder={t('discover.searchPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-[#202225] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#72767d] focus:border-[#5865f2]"
            />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as 'members' | 'newest')}
              className="rounded-xl border border-[#202225] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#5865f2]"
            >
              <option value="members">{t('discover.sortMembers')}</option>
              <option value="newest">{t('discover.sortNewest')}</option>
            </select>
          </div>
        </div>

        {feedback ? (
          <p className="mt-4 text-sm text-rose-300" data-testid="discover-feedback">{feedback}</p>
        ) : null}

        <div className="mt-6">
          {discoverQuery.isLoading ? (
            <LoadingState message={t('common.loading')} />
          ) : communities.length === 0 ? (
            <EmptyState
              title={t('discover.noCommunities')}
              description={trimmedQuery ? undefined : t('discover.listSubtitle')}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {communities.map((community) => {
                const icon = resolveImageRenderProps(community.iconUrl, community.createdAt);
                return (
                  <div
                    key={community.id}
                    className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(19,28,42,0.98),rgba(11,18,29,0.98))] p-5 shadow-[0_18px_42px_rgba(2,8,23,0.22)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-lg font-bold text-white">
                        {community.iconUrl ? (
                          <Image
                            src={icon.src ?? community.iconUrl}
                            alt={community.name}
                            width={56}
                            height={56}
                            unoptimized={icon.unoptimized}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          community.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-white">{community.name}</h2>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#8fa1b5]">
                          {community.memberCount === 1
                            ? t('discover.member', { count: String(community.memberCount) })
                            : t('discover.members', { count: String(community.memberCount) })}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 min-h-[3.75rem] text-sm leading-6 text-[#b5c0cf]">
                      {community.description || t('discover.listSubtitle')}
                    </p>

                    <div className="mt-5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => joinMutation.mutate(community)}
                        disabled={joinMutation.isPending}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {t('discover.join')}
                      </button>
                      <Link
                        href={`/communities/${community.slug}`}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        {t('community.open')}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
