'use client';

import React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import { buildProfileDeepLink, buildProfileWebLink } from '@/lib/profile-share';
import { UserAvatar } from '@/components/UserAvatar';

// ── Minimal QR-like SVG generator ────────────────────────────────────
// For MVP, we generate a simple visual representation using an SVG grid
// derived from the user's profile link. In production, use a proper QR
// library.

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

function generateQRPattern(data: string, size: number): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  // Finder patterns (three corners)
  const finderSize = 7;
  const drawFinder = (startRow: number, startCol: number) => {
    for (let r = 0; r < finderSize; r++) {
      for (let c = 0; c < finderSize; c++) {
        const isBorder = r === 0 || r === finderSize - 1 || c === 0 || c === finderSize - 1;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[startRow + r][startCol + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - finderSize);
  drawFinder(size - finderSize, 0);

  // Fill data area with deterministic pattern from the data hash
  let seed = hashCode(data);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder pattern areas
      const inTopLeft = r < finderSize + 1 && c < finderSize + 1;
      const inTopRight = r < finderSize + 1 && c >= size - finderSize - 1;
      const inBottomLeft = r >= size - finderSize - 1 && c < finderSize + 1;

      if (inTopLeft || inTopRight || inBottomLeft) continue;

      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      grid[r][c] = seed % 3 === 0;
    }
  }

  return grid;
}

interface ProfileQRProps {
  userId?: string;
  className?: string;
  hideHeading?: boolean;
}

export function ProfileQR({ userId, className, hideHeading = false }: ProfileQRProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const effectiveUserId = userId ?? user?.id ?? '';
  const [copiedMode, setCopiedMode] = useState<'link' | 'text' | null>(null);

  const profileLink = useMemo(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://zktalk.app';
    return buildProfileWebLink(baseUrl, effectiveUserId);
  }, [effectiveUserId]);

  const deepLink = useMemo(
    () =>
      buildProfileDeepLink({
        userId: effectiveUserId,
        displayName: user?.displayName,
        username: user?.username,
      }),
    [effectiveUserId, user?.displayName, user?.username],
  );
  const shareText = useMemo(() => {
    const displayName = user?.displayName ?? t('settings.unknown');
    return t('qr.shareTextTemplate', {
      name: displayName,
      link: deepLink,
    });
  }, [deepLink, t, user?.displayName]);

  const qrGrid = useMemo(() => generateQRPattern(deepLink, 25), [deepLink]);

  const cellSize = 8;
  const svgSize = qrGrid.length * cellSize;

  const copyToClipboard = useCallback(async (value: string, mode: 'link' | 'text') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode((current) => (current === mode ? null : current)), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode((current) => (current === mode ? null : current)), 2000);
    }
  }, []);

  if (!effectiveUserId) return null;

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ''}`}>
      <div className="flex flex-col items-center gap-3 text-center">
        <UserAvatar
          displayName={user?.displayName ?? t('settings.unknown')}
          avatarUrl={user?.avatarUrl ?? null}
          size="lg"
        />
        <div>
          <p className="text-sm font-semibold text-fg">
            {user?.displayName ?? t('settings.unknown')}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            @{user?.username ?? 'unknown'}
          </p>
        </div>
      </div>
      {!hideHeading ? (
        <h3 className="text-lg font-semibold text-fg">
          {t('qr.myCode')}
        </h3>
      ) : null}

      {/* QR-like SVG */}
      <div className="rounded-xl bg-white p-4">
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="block"
        >
          {qrGrid.map((row, r) =>
            row.map((cell, c) =>
              cell ? (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000"
                />
              ) : null,
            ),
          )}
        </svg>
      </div>

      {/* Shareable link */}
      <div className="w-full max-w-xs">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-2">
          <input
            type="text"
            value={profileLink}
            readOnly
            className="flex-1 truncate bg-transparent text-xs text-fg-muted focus:outline-none"
          />
          <button
            onClick={() => void copyToClipboard(profileLink, 'link')}
            className="shrink-0 rounded bg-accent px-2 py-1 text-xs text-[color:var(--on-accent)] hover:bg-accent-strong"
          >
            {copiedMode === 'link' ? t('settings.copied') : t('qr.shareLink')}
          </button>
        </div>
        <button
          onClick={() => void copyToClipboard(shareText, 'text')}
          className="mt-2 w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs font-semibold text-fg-muted transition hover:border-line hover:bg-bg-hover"
        >
          {copiedMode === 'text' ? t('settings.copied') : t('qr.copyShareText')}
        </button>
      </div>

      <p className="text-center text-xs text-fg-muted">
        {t('qr.scanDesc')}
      </p>
      <p className="max-w-xs text-center text-xs text-fg-muted">
        {t('qr.shareTextHint')}
      </p>
    </div>
  );
}
