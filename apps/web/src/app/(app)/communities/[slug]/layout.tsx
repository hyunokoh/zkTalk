'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useThreadStore } from '@/stores/thread';
import { useMobileNavStore } from '@/stores/mobile-nav';
import { useCommunityRole } from '@/hooks/useCommunityRole';
import { ChannelSidebar } from '@/components/ChannelSidebar';
import { ThreadPanel } from '@/components/ThreadPanel';
import { CreateChannelModal } from '@/components/CreateChannelModal';
import type { Community } from '@zktalk/shared';
import Link from 'next/link';

const DESKTOP_CHANNEL_SIDEBAR_WIDTH_STORAGE_KEY = 'zktalk-desktop-channel-sidebar-width';
const DEFAULT_DESKTOP_CHANNEL_SIDEBAR_WIDTH = 240;
const MIN_DESKTOP_CHANNEL_SIDEBAR_WIDTH = 208;
const MAX_DESKTOP_CHANNEL_SIDEBAR_WIDTH = 420;

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const slug = params.slug as string;
  const channelId = params.channelId as string | undefined;
  const { t } = useTranslation();
  const activeThreadId = useThreadStore((s) => s.activeThreadId);
  const channelSidebarOpen = useMobileNavStore((s) => s.channelSidebarOpen);
  const toggleChannelSidebar = useMobileNavStore((s) => s.toggleChannelSidebar);
  const closeChannelSidebar = useMobileNavStore((s) => s.closeChannelSidebar);
  const [desktopChannelSidebarWidth, setDesktopChannelSidebarWidth] = useState(
    DEFAULT_DESKTOP_CHANNEL_SIDEBAR_WIDTH,
  );

  const [createChannelModal, setCreateChannelModal] = useState<{
    open: boolean;
    categoryId: string | null;
  }>({ open: false, categoryId: null });

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ['community', slug],
    queryFn: async () => {
      const res = await api<{ community: Community }>(`/api/communities/${slug}`);
      return res.community;
    },
  });

  const { isAdmin } = useCommunityRole(community?.id);

  const handleAddChannel = useCallback((categoryId: string | null) => {
    setCreateChannelModal({ open: true, categoryId });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedWidth = Number(
      window.localStorage.getItem(DESKTOP_CHANNEL_SIDEBAR_WIDTH_STORAGE_KEY),
    );
    if (Number.isFinite(savedWidth)) {
      setDesktopChannelSidebarWidth(
        Math.min(
          MAX_DESKTOP_CHANNEL_SIDEBAR_WIDTH,
          Math.max(MIN_DESKTOP_CHANNEL_SIDEBAR_WIDTH, savedWidth),
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      DESKTOP_CHANNEL_SIDEBAR_WIDTH_STORAGE_KEY,
      String(desktopChannelSidebarWidth),
    );
  }, [desktopChannelSidebarWidth]);

  if (communityLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-transparent px-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-medium text-white/70 shadow-[0_24px_60px_rgba(2,6,23,0.38)] backdrop-blur-xl">
          {t('community.loadingCommunity')}
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="rounded-[2rem] border border-white/10 bg-[#0f1928]/92 px-7 py-6 text-center shadow-[0_28px_70px_rgba(2,8,23,0.5)] backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">{t('community.notFound')}</h2>
          <Link href="/home" className="mt-2 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200">
            {t('community.goHome')}
          </Link>
        </div>
      </div>
    );
  }

  const startSidebarResize = (startClientX: number) => {
    if (typeof window === 'undefined') {
      return;
    }

    const startWidth = desktopChannelSidebarWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: MouseEvent) => {
      const nextWidth = startWidth + (event.clientX - startClientX);
      setDesktopChannelSidebarWidth(
        Math.min(
          MAX_DESKTOP_CHANNEL_SIDEBAR_WIDTH,
          Math.max(MIN_DESKTOP_CHANNEL_SIDEBAR_WIDTH, nextWidth),
        ),
      );
    };

    const handlePointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Mobile channel sidebar toggle button — only on non-channel pages.
          Channel pages render this toggle inline inside the channel header. */}
      {!channelId && (
        <button
          onClick={toggleChannelSidebar}
          className="fixed left-16 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#0f1a2b]/92 text-white/78 shadow-[0_16px_38px_rgba(2,8,23,0.44)] backdrop-blur-xl transition hover:bg-[#152235] hover:text-white md:hidden"
          aria-label="Toggle channels"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={channelSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h10M4 18h16'} />
          </svg>
        </button>
      )}

      {/* Mobile channel sidebar backdrop */}
      {channelSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#020617]/70 backdrop-blur-sm md:hidden"
          onClick={closeChannelSidebar}
        />
      )}

      {/* Channel sidebar: hidden on mobile by default, overlay when open */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 md:relative md:inset-auto md:translate-x-0 md:transition-none ${
          channelSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: `${desktopChannelSidebarWidth}px` }}
      >
        <ChannelSidebar
          community={community}
          isAdmin={isAdmin}
          onAddChannel={handleAddChannel}
          onChannelClick={closeChannelSidebar}
        />
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            startSidebarResize(event.clientX);
          }}
          className="absolute right-0 top-0 hidden h-full w-2 -translate-x-1/2 cursor-col-resize bg-transparent md:block"
          aria-label="Resize channel sidebar"
          title="Resize channel sidebar"
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/8 transition hover:bg-white/30" />
        </button>
      </div>

      {/* Main content area */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden border-l border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%),linear-gradient(180deg,rgba(8,17,29,0.84),rgba(8,17,29,0.96))]">
        {children}
      </div>

      {/* Thread panel (conditionally shown) */}
      {activeThreadId && channelId && (
        <ThreadPanel channelId={channelId} />
      )}

      {/* Create channel modal */}
      {createChannelModal.open && (
        <CreateChannelModal
          communityId={community.id}
          categoryId={createChannelModal.categoryId}
          onClose={() => setCreateChannelModal({ open: false, categoryId: null })}
        />
      )}
    </div>
  );
}
