'use client';

import { useEffect, useState } from 'react';

const RELEASES_API = 'https://api.github.com/repos/hyunokoh/zkTalk/releases/latest';
const DISMISS_KEY = 'zktalk:update-banner-dismissed';
const CHECK_CACHE_KEY = 'zktalk:update-check-cache';
const CHECK_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

interface CachedCheck {
  checkedAt: number;
  latestVersion: string | null;
  releaseUrl: string | null;
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

async function readCurrentVersion(): Promise<string | null> {
  const desktop = window.zkTalkDesktop;
  if (!desktop || typeof desktop.getVersion !== 'function') return null;
  try {
    const v = await desktop.getVersion();
    return typeof v === 'string' ? v : null;
  } catch {
    return null;
  }
}

async function fetchLatest(): Promise<{ tag: string; htmlUrl: string } | null> {
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; html_url?: string };
    if (!data.tag_name || !data.html_url) return null;
    return { tag: data.tag_name, htmlUrl: data.html_url };
  } catch {
    return null;
  }
}

export function UpdateCheckBanner() {
  const [available, setAvailable] = useState<{ version: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const current = await readCurrentVersion();
      if (!current) return;

      // Don't nag past the version they already dismissed
      const dismissedFor = window.localStorage.getItem(DISMISS_KEY);

      // Re-use a cached check for 24h to avoid hammering GitHub
      const cachedRaw = window.localStorage.getItem(CHECK_CACHE_KEY);
      let cached: CachedCheck | null = null;
      try {
        cached = cachedRaw ? (JSON.parse(cachedRaw) as CachedCheck) : null;
      } catch {
        cached = null;
      }

      let latest: { tag: string; htmlUrl: string } | null;
      if (cached && Date.now() - cached.checkedAt < CHECK_TTL_MS && cached.latestVersion) {
        latest = { tag: cached.latestVersion, htmlUrl: cached.releaseUrl ?? '' };
      } else {
        latest = await fetchLatest();
        if (latest) {
          const next: CachedCheck = {
            checkedAt: Date.now(),
            latestVersion: latest.tag,
            releaseUrl: latest.htmlUrl,
          };
          window.localStorage.setItem(CHECK_CACHE_KEY, JSON.stringify(next));
        }
      }

      if (!latest) return;
      if (compareSemver(latest.tag, current) <= 0) return;
      if (dismissedFor === latest.tag) return;
      if (cancelled) return;
      setAvailable({ version: latest.tag, url: latest.htmlUrl });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, available.version);
    setAvailable(null);
  };

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 border-b border-accent/30 bg-accent-soft px-4 py-2 text-[13px] text-fg shadow-sm"
      role="status"
      data-testid="update-check-banner"
    >
      <span className="font-medium">새 버전 {available.version} 이 나왔어요.</span>
      <a
        href={available.url}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-md bg-accent px-3 py-1 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong"
      >
        다운로드 페이지 열기
      </a>
      <button
        onClick={dismiss}
        className="rounded-md px-2 py-1 text-[12px] text-fg-muted hover:bg-bg-hover"
      >
        나중에
      </button>
    </div>
  );
}
