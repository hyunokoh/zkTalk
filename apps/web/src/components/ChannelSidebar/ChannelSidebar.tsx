'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Channel, Category, Community } from '@zktalk/shared';

function ChannelIcon({ type }: { type: string }) {
  if (type === 'announcement') {
    return (
      <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
      </svg>
    );
  }
  if (type === 'forum') {
    return (
      <svg className="h-4 w-4 shrink-0 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  // chat (default)
  return <span className="shrink-0 text-base leading-none text-gray-500">#</span>;
}

interface CategoryGroupProps {
  category: Category | null;
  channels: Channel[];
  communitySlug: string;
  activeChannelId: string | undefined;
  isAdmin: boolean;
  onAddChannel?: (categoryId: string | null) => void;
}

function CategoryGroup({
  category,
  channels,
  communitySlug,
  activeChannelId,
  isAdmin,
  onAddChannel,
}: CategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-1">
      {category && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="group flex w-full items-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-200"
        >
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{category.name}</span>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChannel?.(category.id);
              }}
              className="ml-auto hidden text-gray-400 hover:text-gray-200 group-hover:block"
              title="Create channel"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </button>
      )}

      {!collapsed && (
        <div className="space-y-0.5">
          {channels.map((channel) => {
            const isActive = channel.id === activeChannelId;
            return (
              <Link
                key={channel.id}
                href={`/communities/${communitySlug}/channels/${channel.id}`}
                className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-gray-700 text-gray-100'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <ChannelIcon type={channel.type} />
                <span className="truncate">{channel.name}</span>
                {/* Unread indicator placeholder */}
                {!isActive && false && (
                  <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChannelSidebarProps {
  community: Community;
  isAdmin?: boolean;
  onAddChannel?: (categoryId: string | null) => void;
}

export function ChannelSidebar({ community, isAdmin = false, onAddChannel }: ChannelSidebarProps) {
  const params = useParams();
  const activeChannelId = params.channelId as string | undefined;

  const { data: channels = [] } = useQuery({
    queryKey: ['channels', community.id],
    queryFn: () => api<Channel[]>(`/api/communities/${community.id}/channels`),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', community.id],
    queryFn: () => api<Category[]>(`/api/communities/${community.id}/categories`),
  });

  const grouped = useMemo(() => {
    const catMap = new Map<string | null, Channel[]>();

    // Initialize with known categories
    for (const cat of categories) {
      catMap.set(cat.id, []);
    }
    // Uncategorized bucket
    catMap.set(null, []);

    for (const ch of channels) {
      if (ch.isArchived) continue;
      const key = ch.categoryId;
      const arr = catMap.get(key);
      if (arr) {
        arr.push(ch);
      } else {
        // Category not fetched or unknown; put in uncategorized
        catMap.get(null)!.push(ch);
      }
    }

    // Sort channels within each category by position
    for (const arr of catMap.values()) {
      arr.sort((a, b) => a.position - b.position);
    }

    return catMap;
  }, [channels, categories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.position - b.position),
    [categories],
  );

  return (
    <aside className="flex w-60 flex-col border-r border-gray-800 bg-gray-900">
      {/* Community header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="truncate text-base font-semibold text-gray-100">{community.name}</h2>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Uncategorized channels */}
        {(grouped.get(null)?.length ?? 0) > 0 && (
          <CategoryGroup
            category={null}
            channels={grouped.get(null)!}
            communitySlug={community.slug}
            activeChannelId={activeChannelId}
            isAdmin={isAdmin}
            onAddChannel={onAddChannel}
          />
        )}

        {/* Categorized channels */}
        {sortedCategories.map((cat) => {
          const catChannels = grouped.get(cat.id) ?? [];
          return (
            <CategoryGroup
              key={cat.id}
              category={cat}
              channels={catChannels}
              communitySlug={community.slug}
              activeChannelId={activeChannelId}
              isAdmin={isAdmin}
              onAddChannel={onAddChannel}
            />
          );
        })}

        {channels.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-gray-500">No channels yet</p>
        )}
      </div>
    </aside>
  );
}
