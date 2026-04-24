'use client';

/**
 * /agents — Phase 9A preview surface.
 *
 * This page is the first screen rendered entirely in the Telegram-minimal
 * palette (CSS tokens from `apps/web/src/styles/globals.css`). It deliberately
 * limits itself to an empty state + design-system demo. The live device list,
 * command composer, and approval cards land in Phase 9B.
 *
 * Design references:
 *   docs/ui-design/design-system.md
 *   docs/ui-design/agent-ux.md
 *   docs/ui-design/mockups.html  (Agent 1:1 DM section)
 */

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

function DiamondMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l3.5 5.5 5.5 4-5.5 4L12 21.5l-3.5-5.5L3 12l5.5-4L12 2.5z" />
    </svg>
  );
}

function PlugIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v4a5 5 0 01-5 5 5 5 0 01-5-5V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v5" />
    </svg>
  );
}

export default function AgentsPage() {
  const { t } = useTranslation();

  return (
    <section
      data-testid="agents-page"
      className="flex min-h-0 flex-1 bg-bg text-fg"
    >
      {/* Left: agents sidebar (empty in 9A). Width matches design-system.md §6 sidebar = 280px. */}
      <aside
        data-testid="agents-sidebar"
        className="hidden w-[280px] shrink-0 flex-col border-r border-line bg-bg-subtle md:flex"
      >
        <header className="flex h-14 items-center gap-2 border-b border-line px-4">
          <span className="agent-pill">
            <DiamondMark className="h-3 w-3" />
            {t('agents.title')}
          </span>
          <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            {t('agents.comingSoonBadge')}
          </span>
        </header>

        <p className="px-4 py-3 text-[13px] leading-5 text-fg-muted">
          {t('agents.subtitle')}
        </p>

        {/* Skeleton device rows — pure visual preview of the 9B list */}
        <ul className="flex flex-col gap-1 px-2 py-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex h-14 items-center gap-3 rounded-md px-3 opacity-60"
            >
              <div className="h-9 w-9 rounded-md bg-bg-hover" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-2.5 w-24 rounded-pill bg-bg-hover" />
                <div className="h-2 w-36 rounded-pill bg-bg-hover/70" />
              </div>
              <span className="h-2 w-2 rounded-pill dot-offline" />
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-bg px-6">
          <span className="agent-pill">
            <DiamondMark className="h-3 w-3" />
            {t('agents.title')}
          </span>
          <span className="text-[13px] text-fg-muted">{t('agents.subtitle')}</span>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12">
          <div
            role="region"
            aria-labelledby="agents-empty-title"
            className="w-full max-w-[520px] rounded-lg border border-line bg-bg-elevated p-8 text-center shadow-[var(--shadow-2)]"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-agent-soft text-agent">
              <PlugIcon className="h-7 w-7" />
            </div>

            <h1
              id="agents-empty-title"
              className="text-[17px] font-semibold leading-6 text-fg"
            >
              {t('agents.empty.title')}
            </h1>

            <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[22px] text-fg-muted">
              {t('agents.empty.body')}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                href="/settings"
                data-testid="agents-empty-cta"
                className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-[13px] font-semibold text-[color:var(--on-accent)] transition hover:bg-accent-strong focus-visible:outline-none"
              >
                {t('agents.empty.cta')}
              </Link>
              <a
                href="https://github.com/"
                rel="noopener noreferrer"
                target="_blank"
                className="inline-flex h-10 items-center rounded-md border border-line px-4 text-[13px] font-semibold text-fg-muted transition hover:border-line-strong hover:text-fg"
              >
                GitHub
              </a>
            </div>

            {/* Tiny design-system self-demo — proves tokens resolve in prod */}
            <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden="true">
              <span className="h-6 rounded-sm bg-accent" />
              <span className="h-6 rounded-sm bg-agent" />
              <span className="h-6 rounded-sm bg-success" />
              <span className="h-6 rounded-sm bg-warning" />
              <span className="h-6 rounded-sm bg-danger" />
              <span className="h-6 rounded-sm bg-bg-hover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
