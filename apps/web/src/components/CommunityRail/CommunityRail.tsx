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
// ProfileEditor used to open inline from the rail; the avatar now links
// straight to /settings instead, so the modal is no longer mounted here.
import { ThemeToggle } from '@/components/ThemeToggle';

// Muted pastel palette — used as a subtle differentiator between community
// tiles when no icon has been uploaded. These are intentionally low-chroma
// so the rail stays inside the Telegram-minimal neutral + single-accent
// language; pick per id via a stable hash.
const COMMUNITY_TILE_PALETTE = [
  'bg-[color-mix(in_oklab,var(--accent)_18%,var(--bg-subtle))]',
  'bg-[color-mix(in_oklab,var(--agent)_18%,var(--bg-subtle))]',
  'bg-[color-mix(in_oklab,var(--success)_18%,var(--bg-subtle))]',
  'bg-[color-mix(in_oklab,var(--warning)_18%,var(--bg-subtle))]',
  'bg-[color-mix(in_oklab,var(--danger)_14%,var(--bg-subtle))]',
  'bg-bg-subtle',
];
const AVATAR_VERSION_STORAGE_KEY = 'zktalk-avatar-version';
const AVATAR_VERSION_EVENT = 'zktalk-avatar-version-updated';

function getCommunityTileTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return COMMUNITY_TILE_PALETTE[Math.abs(hash) % COMMUNITY_TILE_PALETTE.length];
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

type TopLevelRoute =
  | 'home'
  | 'inbox'
  | 'dm'
  | 'friends'
  | 'agents'
  | 'bookmarks'
  | 'cards'
  | 'settings';

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

function AgentsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  // Diamond + sparkle mark, echoes the ◆ marker used in AgentMessageBubble.
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l3.25 5.25 5.25 3.25-5.25 3.25L12 20.5l-3.25-5.25L3.5 12l5.25-3.25L12 3.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.25 4.25l.9 1.5 1.5.9-1.5.9-.9 1.5-.9-1.5-1.5-.9 1.5-.9.9-1.5z" />
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

function CardsIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="9" cy="11" r="1.6" />
      <path strokeLinecap="round" d="M9 14h.01M14 10h4M14 13h3" />
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

function SparkleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

// Tailwind class tokens for Rail Tab states (design-system.md §7.2).
//   active   — bg-accent-soft, text-accent, 3px bg-accent left indicator
//   inactive — text-fg-muted, hover:bg-bg-hover
const NAV_TILE_BASE =
  'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150';
const NAV_TILE_ACTIVE = 'bg-accent-soft text-accent';
const NAV_TILE_INACTIVE = 'text-fg-muted hover:bg-bg-hover hover:text-fg';

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
  // The rail avatar links straight to /settings (where the profile editor
  // also lives) — one entry point, not two. Settings is no longer a
  // separate icon in the rail.

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
      key: 'agents',
      href: '/agents',
      title: t('nav.agents'),
      isActive: pathname.startsWith('/agents'),
      icon: <AgentsIcon />,
    },
    {
      key: 'bookmarks',
      href: '/bookmarks',
      title: t('nav.bookmarks'),
      isActive: pathname.startsWith('/bookmarks'),
      icon: <BookmarkIcon />,
    },
    {
      key: 'cards',
      href: '/cards',
      title: t('nav.cards'),
      isActive: pathname.startsWith('/cards'),
      icon: <CardsIcon />,
    },
  ];

  return (
    <nav className="flex h-screen w-full flex-col items-center gap-2 overflow-y-auto border-r border-line bg-bg px-2 py-3 [scrollbar-width:thin]">
      <Link
        href="/settings"
        title={currentUser?.displayName ?? t('settings.title')}
        aria-label={t('settings.title')}
        data-testid="community-rail-profile-link"
        className="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-bg-hover"
      >
        <UserAvatar
          key={`${currentUser?.displayName ?? 'profile'}:${profileAvatarUrl ?? ''}`}
          displayName={currentUser?.displayName ?? t('settings.title')}
          avatarUrl={profileAvatarUrl}
          size="md"
        />
        <span className="sr-only">{t('settings.title')}</span>
      </Link>

      {onOpenAI && (
        <button
          onClick={onOpenAI}
          title="AI Assistant"
          aria-label="AI Assistant"
          data-testid="community-rail-ai-button"
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-agent transition-colors duration-150 hover:bg-agent-soft"
        >
          <SparkleIcon />
        </button>
      )}

      <div className="flex w-full flex-col items-center gap-1">
        {topLevelNavItems.map((item) => {
          const badgeCount = item.count ?? 0;
          return (
            <div key={item.key} className="group relative">
              <Link
                href={item.href}
                title={item.title}
                aria-label={item.title}
                data-testid={`community-rail-nav-${item.key}`}
                className={`${NAV_TILE_BASE} ${item.isActive ? NAV_TILE_ACTIVE : NAV_TILE_INACTIVE}`}
              >
                {item.icon}
                <span className="sr-only">{item.title}</span>
              </Link>
              {badgeCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-danger px-1 text-[10px] font-semibold leading-none text-white">
                  {formatBadgeCount(badgeCount)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mx-auto my-1 h-px w-8 bg-line" />

      {/* Communities list: no inner scroll — the outer <nav> is the
          single scrollable surface so dragging on top-nav, communities
          and create/theme tiles all behave the same. */}
      <div className="flex w-full flex-col items-center gap-1 py-1">
        {applyCommunityOrder(communities, communityOrder).map((community) => {
          const isActive = activeSlug === community.slug;
          const tile = getCommunityTileTint(community.id);
          const hasUnread = hasCommunityUnread(community.id);
          const communityIcon = resolveImageRenderProps(
            community.iconUrl,
            community.updatedAt,
          );

          return (
            <div key={community.id} className="group relative">
              <Link
                href={`/communities/${community.slug}`}
                title={community.name}
                aria-label={community.name}
                data-testid={`community-rail-community-${community.slug}`}
                className={`relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'text-accent ring-2 ring-accent'
                    : 'text-fg hover:ring-1 hover:ring-line-strong'
                } ${tile}`}
              >
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
                <span className="sr-only">{community.name}</span>
              </Link>
              {hasUnread && !isActive && (
                <span className="absolute -right-0.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-bg bg-accent" />
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
        className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted transition-colors duration-150 hover:bg-bg-hover hover:text-accent"
      >
        <PlusIcon />
        <span className="sr-only">{t('community.createCommunity')}</span>
      </Link>

      {/* Theme toggle lives at the very bottom of the rail — sun/moon icon,
          uses the same 44×44 tile sizing as the nav items so it sits in line
          visually. */}
      <div className="mt-1 flex w-full items-center justify-center">
        <ThemeToggle />
      </div>
    </nav>
  );
}
