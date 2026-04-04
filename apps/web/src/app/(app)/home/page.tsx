'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import { resolveImageRenderProps } from '@/lib/image-optimization';
import {
  applyCommunityOrder,
  fetchUserSettings,
  getCachedCommunityOrder,
  saveCommunityOrder,
} from '@/lib/user-settings';
import type { LastVisitedLocation } from '@zktalk/shared';
import type { Community } from '@zktalk/shared';

export default function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [inviteInput, setInviteInput] = useState('');
  const [orderedCommunities, setOrderedCommunities] = useState<Community[]>([]);
  const dragSrcIdx = useRef<number | null>(null);

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const res = await api<{ communities: Community[] }>('/api/communities');
      return res.communities;
    },
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: fetchUserSettings,
    enabled: !!user,
  });

  useEffect(() => {
    const communityOrder = settings?.communityOrder ?? getCachedCommunityOrder();
    setOrderedCommunities(applyCommunityOrder(communities, communityOrder));
  }, [communities, settings?.communityOrder]);

  useEffect(() => {
    if (!settings?.lastVisited) {
      return;
    }

    const lastVisited: LastVisitedLocation = settings.lastVisited;
    if (lastVisited.kind === 'dm' && lastVisited.conversationId) {
      router.replace(`/dm/${lastVisited.conversationId}`);
      return;
    }

    if (lastVisited.kind === 'thread' && lastVisited.communityId && lastVisited.channelId && lastVisited.threadId) {
      const targetCommunity = communities.find((community) => community.id === lastVisited.communityId);
      if (targetCommunity) {
        router.replace(`/communities/${targetCommunity.slug}/channels/${lastVisited.channelId}/threads/${lastVisited.threadId}`);
      }
      return;
    }

    if ((lastVisited.kind === 'channel' || lastVisited.kind === 'community') && lastVisited.communityId) {
      const targetCommunity = communities.find((community) => community.id === lastVisited.communityId);
      if (!targetCommunity) {
        return;
      }

      if (lastVisited.kind === 'channel' && lastVisited.channelId) {
        router.replace(`/communities/${targetCommunity.slug}/channels/${lastVisited.channelId}`);
        return;
      }

      router.replace(`/communities/${targetCommunity.slug}`);
    }
  }, [communities, router, settings?.lastVisited]);

  function handleDragStart(index: number) {
    dragSrcIdx.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const src = dragSrcIdx.current;
    if (src === null || src === index) return;
    setOrderedCommunities((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(index, 0, moved);
      dragSrcIdx.current = index;
      return next;
    });
  }

  function handleDrop() {
    dragSrcIdx.current = null;
    void saveCommunityOrder(orderedCommunities.map((c) => c.id));
  }

  const normalizeInviteCode = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const invitePathMatch = trimmed.match(/\/invite(?:s)?\/([a-zA-Z0-9_-]+)/i);
    if (invitePathMatch?.[1]) {
      return invitePathMatch[1];
    }

    const codeLabelMatch = trimmed.match(/code[:\s]+([a-zA-Z0-9_-]+)/i);
    if (codeLabelMatch?.[1]) {
      return codeLabelMatch[1];
    }

    const tokens = trimmed.replace(/\s+/g, ' ').match(/[a-zA-Z0-9_-]{6,32}/g);
    if (!tokens?.length) {
      return '';
    }

    return tokens[tokens.length - 1] ?? '';
  }, []);

  const handleInviteSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = normalizeInviteCode(inviteInput);
    if (!code) return;
    router.push(`/invite/${encodeURIComponent(code)}`);
  }, [inviteInput, normalizeInviteCode, router]);

  return (
    <div className="flex flex-1 flex-col bg-[#36393f]">
      <header className="border-b border-[#202225] px-6 py-4 pl-14 md:pl-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">{t('community.yours')}</h1>
            <p className="mt-1 text-sm text-[#9ca3af]">{t('home.desktopInviteBody')}</p>
          </div>
          <div className="flex flex-col gap-3 xl:min-w-[420px] xl:max-w-[560px] xl:flex-1 xl:items-end">
            <form
              onSubmit={handleInviteSubmit}
              className="flex w-full flex-col gap-2 xl:max-w-[560px] xl:flex-row"
            >
              <input
                value={inviteInput}
                onChange={(event) => setInviteInput(event.target.value)}
                placeholder={t('home.desktopInvitePlaceholder')}
                className="min-w-0 flex-1 rounded-xl border border-[#202225] bg-[#1e1f22] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#72767d] focus:border-[#5865f2]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#5865f2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
              >
                {t('community.joinInviteCta')}
              </button>
            </form>
            <div className="flex w-full items-center justify-between gap-3 xl:max-w-[560px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8e9297]">
                {t('app.desktopPasteInvite')}
              </p>
              <Link
                href="/communities/new"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                {t('community.createCommunity')}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {isLoading ? (
            <LoadingState message={t('community.loadingCommunities')} compact />
          ) : orderedCommunities.length === 0 ? (
            <EmptyState
              title={t('community.noJoined')}
              description={t('home.noCommunityHint')}
              action={(
                <Link
                  href="/communities/new"
                  className="inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  {t('community.createCommunity')}
                </Link>
              )}
            />
          ) : (
            <div className="space-y-1">
              {orderedCommunities.map((community, index) => {
                const communityIcon = resolveImageRenderProps(
                  community.iconUrl,
                  community.updatedAt,
                );
                return (
                  <div
                    key={community.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className="group flex items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="flex cursor-grab items-center text-[#4f545c] opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="5" cy="4" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="12" r="1.2" />
                        <circle cx="11" cy="4" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="12" r="1.2" />
                      </svg>
                    </span>
                    <Link
                      href={`/communities/${community.slug}`}
                      data-testid={`home-community-link-${community.slug}`}
                      className="flex flex-1 items-center gap-4 overflow-hidden"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">
                        {community.iconUrl ? (
                          <Image
                            src={communityIcon.src ?? community.iconUrl}
                            alt={community.name}
                            width={44}
                            height={44}
                            unoptimized={communityIcon.unoptimized}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          community.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#dcddde]">{community.name}</h3>
                        {community.description && (
                          <p className="truncate text-sm text-[#96989d]">
                            {community.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#72767d]">
                        {community.visibility === 'public'
                          ? t('community.public')
                          : community.visibility === 'invite_only'
                            ? t('community.inviteOnly')
                            : t('community.private')}
                      </span>
                    </Link>
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
