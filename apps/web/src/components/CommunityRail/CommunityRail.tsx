'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import type { Community } from '@zktalk/shared';
import { useUnreadStore } from '@/stores/unread';
import { resolveImageRenderProps } from '@/lib/image-optimization';
import {
  applyCommunityOrder,
  COMMUNITY_ORDER_UPDATED_EVENT,
  getCachedCommunityOrder,
} from '@/lib/user-settings';
import { UserAvatar } from '@/components/UserAvatar';

const COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-teal-600',
];
const AVATAR_VERSION_STORAGE_KEY = 'zktalk-avatar-version';
const AVATAR_VERSION_EVENT = 'zktalk-avatar-version-updated';

function getCommunityColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface CommunityRailProps {
  communities: Community[];
  inboxCount?: number;
  dmCount?: number;
  friendCount?: number;
  currentUser?: {
    displayName: string;
    avatarUrl?: string | null;
  } | null;
  onOpenAI?: () => void;
}

type TopLevelRoute = 'home' | 'inbox' | 'dm' | 'friends' | 'bookmarks' | 'settings';

function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.75L12 4l9 6.75" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 10.5V20h10.5v-9.5" />
    </svg>
  );
}

function DmIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7.5A2.5 2.5 0 017.5 5h9A2.5 2.5 0 0119 7.5v6A2.5 2.5 0 0116.5 16H10l-4.5 3v-3H7.5A2.5 2.5 0 015 13.5v-6z" />
    </svg>
  );
}

function InboxIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h15v9.75a2.25 2.25 0 0 1-2.25 2.25h-10.5A2.25 2.25 0 0 1 4.5 16.5V6.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 13.5h4.114a1.5 1.5 0 0 1 1.342.829l.17.342a1.5 1.5 0 0 0 1.342.829h.064a1.5 1.5 0 0 0 1.342-.829l.17-.342a1.5 1.5 0 0 1 1.342-.829H19.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6.75V5.625A1.875 1.875 0 0 1 9.375 3.75h5.25A1.875 1.875 0 0 1 16.5 5.625V6.75" />
    </svg>
  );
}

function FriendsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 19v-1.25A3.75 3.75 0 0011.75 14H7.5a3.75 3.75 0 00-3.75 3.75V19" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 11a3 3 0 100-6 3 3 0 000 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.75 19v-1a3.25 3.25 0 00-3.25-3.25h-1" />
    </svg>
  );
}

function BookmarkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h10.5A1.5 1.5 0 0 1 18.75 6v14.25L12 16.5l-6.75 3.75V6A1.5 1.5 0 0 1 6.75 4.5Z" />
    </svg>
  );
}

function SettingsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75l1.15 2.33 2.58.38-1.86 1.82.44 2.57L12 9.77 9.69 10.85l.44-2.57-1.86-1.82 2.58-.38L12 3.75z" />
      <circle cx="12" cy="12" r="3.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 13.2v-2.4l-1.75-1 1.25-2.17 2 .45 1.7-1.4-.15-2.05h2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 10.8v2.4l1.75 1-1.25 2.17-2-.45-1.7 1.4.15 2.05h-2.5" />
    </svg>
  );
}

function PlusIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function CommunityRail({
  communities: communitiesProp,
  inboxCount = 0,
  dmCount = 0,
  friendCount = 0,
  currentUser = null,
  onOpenAI,
}: CommunityRailProps) {
  const { t } = useTranslation();
  const communities = useMemo(
    () => (Array.isArray(communitiesProp) ? communitiesProp : []),
    [communitiesProp],
  );
  const params = useParams();
  const pathname = usePathname();
  const activeSlug = params.slug as string | undefined;
  const { fetchUnread, hasCommunityUnread } = useUnreadStore();
  const [avatarVersion, setAvatarVersion] = useState('');
  const [communityOrder, setCommunityOrderState] = useState<string[]>([]);

  // Fetch unread counts for all communities
  useEffect(() => {
    for (const community of communities) {
      fetchUnread(community.id);
    }
  }, [communities, fetchUnread]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncAvatarVersion = () => {
      setAvatarVersion(window.localStorage.getItem(AVATAR_VERSION_STORAGE_KEY) ?? '');
    };

    syncAvatarVersion();
    window.addEventListener('storage', syncAvatarVersion);
    window.addEventListener(AVATAR_VERSION_EVENT, syncAvatarVersion);
    return () => {
      window.removeEventListener('storage', syncAvatarVersion);
      window.removeEventListener(AVATAR_VERSION_EVENT, syncAvatarVersion);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sync = () => setCommunityOrderState(getCachedCommunityOrder());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(COMMUNITY_ORDER_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(COMMUNITY_ORDER_UPDATED_EVENT, sync);
    };
  }, []);

  const profileAvatarUrl = useMemo(() => {
    if (!currentUser?.avatarUrl || !avatarVersion) {
      return currentUser?.avatarUrl ?? null;
    }

    const separator = currentUser.avatarUrl.includes('?') ? '&' : '?';
    return `${currentUser.avatarUrl}${separator}v=${avatarVersion}`;
  }, [avatarVersion, currentUser?.avatarUrl]);

  const topLevelNavItems: Array<{
    key: TopLevelRoute;
    href: string;
    title: string;
    count?: number;
    isActive: boolean;
    icon: React.ReactNode;
  }> = [
    {
      key: 'home',
      href: '/home',
      title: t('nav.home'),
      isActive: pathname === '/home' || pathname.startsWith('/communities/'),
      icon: <HomeIcon />,
    },
    {
      key: 'inbox',
      href: '/inbox',
      title: t('nav.inbox'),
      count: inboxCount,
      isActive: pathname.startsWith('/inbox'),
      icon: <InboxIcon />,
    },
    {
      key: 'dm',
      href: '/dm',
      title: t('nav.dms'),
      count: dmCount,
      isActive: pathname.startsWith('/dm'),
      icon: <DmIcon />,
    },
    {
      key: 'friends',
      href: '/friends',
      title: t('nav.friends'),
      count: friendCount,
      isActive: pathname.startsWith('/friends'),
      icon: <FriendsIcon />,
    },
    {
      key: 'bookmarks',
      href: '/bookmarks',
      title: t('nav.bookmarks'),
      isActive: pathname.startsWith('/bookmarks'),
      icon: <BookmarkIcon />,
    },
    {
      key: 'settings',
      href: '/settings',
      title: t('nav.settings'),
      isActive: pathname.startsWith('/settings'),
      icon: <SettingsIcon />,
    },
  ];

  return (
    <nav className="flex h-screen w-full flex-col items-center gap-3 border-r border-white/8 bg-[linear-gradient(180deg,#091321_0%,#0c1828_48%,#0b1523_100%)] px-3 py-4 shadow-[18px_0_48px_rgba(2,8,23,0.34)]">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[11px] font-semibold tracking-[0.28em] text-white/72 shadow-[0_14px_30px_rgba(2,8,23,0.25)]">
        ZT
      </div>
      <Link
        href="/settings#profile-edit"
        title={currentUser?.displayName ?? t('profile.edit')}
        aria-label={t('profile.edit')}
        data-testid="community-rail-profile-link"
        className="group relative flex w-full items-center justify-center"
      >
        <span className="absolute left-[-0.75rem] h-6 w-[3px] rounded-r-full bg-sky-300 opacity-0 transition group-hover:opacity-100" />
        <span className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/[0.04] shadow-[0_16px_35px_rgba(2,8,23,0.28)] transition duration-150 group-hover:-translate-y-0.5 group-hover:bg-white/[0.09]">
          <UserAvatar
            key={`${currentUser?.displayName ?? 'profile'}:${profileAvatarUrl ?? ''}`}
            displayName={currentUser?.displayName ?? t('profile.edit')}
            avatarUrl={profileAvatarUrl}
            size="md"
          />
        </span>
        <span className="sr-only">{t('profile.edit')}</span>
      </Link>

      {onOpenAI && (
        <button
          onClick={onOpenAI}
          title="AI Assistant"
          aria-label="AI Assistant"
          data-testid="community-rail-ai-button"
          className="group relative flex h-12 w-12 items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/[0.04] text-indigo-400 shadow-[0_16px_35px_rgba(2,8,23,0.28)] transition duration-150 hover:-translate-y-0.5 hover:bg-white/[0.09] hover:text-indigo-300"
        >
          <span className="absolute left-[-0.75rem] h-6 w-[3px] rounded-r-full bg-indigo-400 opacity-0 transition group-hover:opacity-100" />
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </button>
      )}

      <div className="flex w-full flex-col items-center gap-2">
        {topLevelNavItems.map((item) => (
          <div key={item.key} className="group relative">
            {(() => {
              const badgeCount = item.count ?? 0;
              return (
                <>
                  <span
                    className={`absolute -left-3 top-1/2 -translate-y-1/2 rounded-r-full bg-sky-300 transition-all ${
                      item.isActive
                        ? 'h-11 w-[3px] opacity-100'
                        : 'h-5 w-[3px] opacity-0 group-hover:opacity-100'
                    }`}
                  />
                  <Link
                    href={item.href}
                    title={item.title}
                    aria-label={item.title}
                    data-testid={`community-rail-nav-${item.key}`}
                    className={`relative flex h-12 w-12 items-center justify-center border text-white transition duration-150 ${
                      item.isActive
                        ? 'rounded-[1.15rem] border-sky-300/40 bg-[linear-gradient(180deg,rgba(79,109,255,0.95),rgba(58,81,204,0.95))] shadow-[0_18px_35px_rgba(52,84,208,0.35)]'
                        : 'rounded-[1.55rem] border-white/8 bg-white/[0.03] text-white/68 hover:-translate-y-0.5 hover:rounded-[1.15rem] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span className="sr-only">{item.title}</span>
                  </Link>
                  {badgeCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-4 border-[#091321] bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
                      {formatBadgeCount(badgeCount)}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        ))}
      </div>

      <div className="mx-auto h-px w-9 bg-white/10" />

      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto py-1">
        {applyCommunityOrder(communities, communityOrder).map((community) => {
          const isActive = activeSlug === community.slug;
          const color = getCommunityColor(community.id);
          const hasUnread = hasCommunityUnread(community.id);
          const communityIcon = resolveImageRenderProps(
            community.iconUrl,
            community.updatedAt,
          );

          return (
            <div key={community.id} className="group relative">
              <span
                className={`absolute -left-3 top-1/2 -translate-y-1/2 rounded-r-full bg-sky-300 transition-all ${
                  isActive
                    ? 'h-11 w-[3px] opacity-100'
                    : 'h-5 w-[3px] opacity-0 group-hover:opacity-100'
                }`}
              />
              <Link
                href={`/communities/${community.slug}`}
                title={community.name}
                aria-label={community.name}
                data-testid={`community-rail-community-${community.slug}`}
                className={`flex h-12 w-12 items-center justify-center border text-sm font-semibold text-white transition duration-150 ${
                  isActive
                    ? `${color} rounded-[1.15rem] border-white/16 shadow-[0_18px_32px_rgba(2,8,23,0.32)]`
                    : `${color} rounded-[1.55rem] border-white/8 opacity-90 hover:-translate-y-0.5 hover:rounded-[1.15rem] hover:opacity-100`
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-[inherit]">
                  {community.iconUrl ? (
                    <Image
                      src={communityIcon.src ?? community.iconUrl}
                      alt={community.name}
                      width={48}
                      height={48}
                      unoptimized={communityIcon.unoptimized}
                      className="h-full w-full rounded-[inherit] object-cover"
                    />
                  ) : (
                    community.name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="sr-only">{community.name}</span>
              </Link>
              {hasUnread && !isActive && (
                <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#091321] bg-sky-200" />
              )}
            </div>
          );
        })}
      </div>

      <Link
        href="/communities/new"
        title={t('community.createCommunity')}
        aria-label={t('community.createCommunity')}
        data-testid="community-rail-create-community"
        className="group relative flex h-12 w-12 items-center justify-center rounded-[1.55rem] border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 transition duration-150 hover:-translate-y-0.5 hover:rounded-[1.15rem] hover:bg-emerald-500 hover:text-white"
      >
        <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-300 opacity-0 transition group-hover:opacity-100" />
        <PlusIcon />
        <span className="sr-only">{t('community.createCommunity')}</span>
      </Link>
    </nav>
  );
}
