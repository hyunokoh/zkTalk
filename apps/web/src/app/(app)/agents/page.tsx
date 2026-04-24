'use client';

/**
 * /agents — Phase 9B device dashboard.
 *
 * Left: AgentDeviceSidebar (live device list).
 * Right: grid of DeviceCards, or empty-state when no devices are connected yet.
 *
 * Design references:
 *   docs/ui-design/design-system.md
 *   docs/ui-design/agent-ux.md
 */

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchDevices, type ListDevicesResponse } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';
import { AgentDeviceSidebar } from '@/components/AgentDeviceSidebar';
import { DeviceCard } from '@/components/DeviceCard';

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
  const { data, isLoading, isError } = useQuery<ListDevicesResponse>({
    queryKey: ['agent-devices'],
    queryFn: fetchDevices,
    staleTime: 15_000,
  });

  const devices = data?.devices ?? [];
  const agentsByDevice = data?.agentsByDevice ?? {};

  return (
    <section
      data-testid="agents-page"
      className="flex min-h-0 flex-1 bg-bg text-fg"
    >
      <AgentDeviceSidebar activeDeviceId={null} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-bg px-6">
          <span className="agent-pill">
            <DiamondMark className="h-3 w-3" />
            {t('agents.title')}
          </span>
          <span className="text-[13px] text-fg-muted">{t('agents.subtitle')}</span>
          <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
            {devices.length} {devices.length === 1 ? 'device' : 'devices'}
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-6 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[168px] animate-pulse rounded-lg border border-line bg-bg-elevated"
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-1 items-center justify-center px-6 py-12">
              <p className="text-[13px] text-danger">
                {t('common.error')}
              </p>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 py-12">
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
                </div>
              </div>
            </div>
          ) : (
            <div
              data-testid="agents-dashboard-grid"
              className="grid flex-1 grid-cols-1 gap-3 overflow-auto p-6 sm:grid-cols-2 xl:grid-cols-3"
            >
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  agents={agentsByDevice[device.id] ?? []}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
