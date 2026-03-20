'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Community } from '@zktalk/shared';

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
}

export function CommunityRail({ communities }: CommunityRailProps) {
  const params = useParams();
  const activeSlug = params.slug as string | undefined;

  return (
    <nav className="flex h-screen w-16 flex-col items-center gap-2 overflow-y-auto bg-gray-950 py-3">
      {/* Home button */}
      <Link
        href="/home"
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold transition-all hover:rounded-xl ${
          !activeSlug
            ? 'bg-indigo-600 text-white rounded-xl'
            : 'bg-gray-700 text-gray-300 hover:bg-indigo-600 hover:text-white'
        }`}
      >
        z
      </Link>

      <div className="mx-auto my-1 h-px w-8 bg-gray-700" />

      {/* Community icons */}
      {communities.map((community) => {
        const isActive = activeSlug === community.slug;
        const color = getCommunityColor(community.id);

        return (
          <Link
            key={community.id}
            href={`/communities/${community.slug}`}
            title={community.name}
            className={`flex h-12 w-12 items-center justify-center text-sm font-semibold text-white transition-all hover:rounded-xl ${
              isActive ? `${color} rounded-xl` : `${color} rounded-2xl opacity-70 hover:opacity-100`
            }`}
          >
            {community.iconUrl ? (
              <img
                src={community.iconUrl}
                alt={community.name}
                className="h-full w-full rounded-[inherit] object-cover"
              />
            ) : (
              community.name.charAt(0).toUpperCase()
            )}
          </Link>
        );
      })}

      {/* Create community button */}
      <Link
        href="/communities/new"
        title="Create a community"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-700 text-xl text-green-500 transition-all hover:rounded-xl hover:bg-green-600 hover:text-white"
      >
        +
      </Link>
    </nav>
  );
}
