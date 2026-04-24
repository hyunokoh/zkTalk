'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchDevices, type ListDevicesResponse } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';
import type { AgentDevice, DeviceState } from '@zktalk/shared';

function DiamondMark({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l3.5 5.5 5.5 4-5.5 4L12 21.5l-3.5-5.5L3 12l5.5-4L12 2.5z" />
    </svg>
  );
}

function dotClassFor(state: DeviceState): string {
  switch (state) {
    case 'online':
      return 'dot-online';
    case 'busy':
      return 'dot-busy';
    default:
      return 'dot-offline';
  }
}

function stateLabel(state: DeviceState): string {
  switch (state) {
    case 'online':
      return 'Online';
    case 'busy':
      return 'Busy';
    case 'degraded':
      return 'Degraded';
    case 'suspended':
      return 'Suspended';
    default:
      return 'Offline';
  }
}

export function AgentDeviceSidebar({ activeDeviceId }: { activeDeviceId?: string | null }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { data, isLoading, isError } = useQuery<ListDevicesResponse>({
    queryKey: ['agent-devices'],
    queryFn: fetchDevices,
    staleTime: 15_000,
  });

  const devices = data?.devices ?? [];
  const dashboardIsActive = pathname === '/agents' && !activeDeviceId;

  return (
    <aside
      data-testid="agents-sidebar"
      className="hidden w-[280px] shrink-0 flex-col border-r border-line bg-bg-subtle md:flex"
    >
      <header className="flex h-14 items-center gap-2 border-b border-line px-4">
        <span className="agent-pill">
          <DiamondMark />
          {t('agents.title')}
        </span>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.08em] text-fg-subtle">
          {devices.length} {devices.length === 1 ? 'device' : 'devices'}
        </span>
      </header>

      <nav className="flex flex-col gap-0.5 px-2 py-2" aria-label={t('agents.title')}>
        <Link
          href="/agents"
          data-testid="agents-sidebar-dashboard"
          className={`flex h-10 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors ${
            dashboardIsActive
              ? 'bg-bg-hover text-fg'
              : 'text-fg-muted hover:bg-bg-hover hover:text-fg'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-fg-subtle" aria-hidden="true" />
          Dashboard
        </Link>

        {isLoading ? (
          <ul className="mt-1 flex flex-col gap-1 px-1 py-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="flex h-12 items-center gap-3 rounded-md px-2 opacity-60"
              >
                <div className="h-8 w-8 rounded-md bg-bg-hover" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="h-2.5 w-20 rounded-pill bg-bg-hover" />
                  <div className="h-2 w-28 rounded-pill bg-bg-hover/70" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="px-3 py-3 text-[12px] text-fg-muted">
            {t('common.error')}
          </div>
        ) : devices.length === 0 ? (
          <div className="mt-1 rounded-md border border-dashed border-line px-3 py-4 text-[12px] leading-[18px] text-fg-muted">
            {t('agents.empty.sidebar')}
          </div>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5" role="list">
            {devices.map((device) => (
              <DeviceRow
                key={device.id}
                device={device}
                isActive={activeDeviceId === device.id}
              />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}

function DeviceRow({ device, isActive }: { device: AgentDevice; isActive: boolean }) {
  return (
    <li>
      <Link
        href={`/agents/${device.id}`}
        data-testid={`agents-sidebar-device-${device.slug}`}
        className={`flex h-12 items-center gap-3 rounded-md px-3 text-[13px] transition-colors ${
          isActive
            ? 'bg-bg-hover text-fg'
            : 'text-fg hover:bg-bg-hover'
        }`}
      >
        <span
          className={`h-8 w-8 shrink-0 rounded-md bg-bg-elevated text-[11px] uppercase tracking-wide text-fg-muted flex items-center justify-center font-semibold`}
          aria-hidden="true"
        >
          {device.slug.slice(0, 2)}
        </span>
        <span className="flex flex-1 flex-col min-w-0">
          <span className="truncate font-medium text-fg">{device.name}</span>
          <span className="truncate text-[11px] text-fg-muted">
            {stateLabel(device.state)} · {device.slug}
          </span>
        </span>
        <span
          className={`h-2 w-2 shrink-0 rounded-pill ${dotClassFor(device.state)}`}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
