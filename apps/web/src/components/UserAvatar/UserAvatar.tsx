'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { resolveImageRenderProps } from '@/lib/image-optimization';

const AVATAR_VERSION_STORAGE_KEY = 'zktalk-avatar-version';
const AVATAR_VERSION_EVENT = 'zktalk-avatar-version-updated';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

const dotSizes = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
} as const;

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  isOnline?: boolean;
}

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size = 'md',
  className = '',
  isOnline,
}: UserAvatarProps) {
  const [avatarVersion, setAvatarVersion] = useState('');
  const sizeClasses = sizes[size];
  const dotSize = dotSizes[size];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncVersion = () => {
      setAvatarVersion(window.localStorage.getItem(AVATAR_VERSION_STORAGE_KEY) ?? '');
    };

    syncVersion();
    window.addEventListener('storage', syncVersion);
    window.addEventListener(AVATAR_VERSION_EVENT, syncVersion);
    return () => {
      window.removeEventListener('storage', syncVersion);
      window.removeEventListener(AVATAR_VERSION_EVENT, syncVersion);
    };
  }, []);

  const versionedAvatarUrl = useMemo(() => {
    if (!avatarUrl || !avatarVersion) {
      return avatarUrl;
    }

    const separator = avatarUrl.includes('?') ? '&' : '?';
    return `${avatarUrl}${separator}v=${avatarVersion}`;
  }, [avatarUrl, avatarVersion]);

  const onlineDot = isOnline != null && isOnline ? (
    <span
      className={`absolute bottom-0 right-0 block ${dotSize} rounded-full border-2 border-white bg-success dark:border-line`}
    />
  ) : null;

  if (versionedAvatarUrl) {
    const image = resolveImageRenderProps(versionedAvatarUrl);
    return (
      <span className="relative inline-block">
        <Image
          src={image.src ?? versionedAvatarUrl}
          alt={displayName}
          width={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
          height={size === 'sm' ? 32 : size === 'md' ? 40 : 56}
          unoptimized={image.unoptimized}
          className={`${sizeClasses} shrink-0 rounded-full object-cover ${className}`}
        />
        {onlineDot}
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <div
        className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-accent font-medium text-[color:var(--on-accent)] ${className}`}
      >
        {getInitials(displayName)}
      </div>
      {onlineDot}
    </span>
  );
}
