'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDevices, type ListDevicesResponse } from '@/lib/api-agents';
import { useTranslation } from '@/lib/i18n';
import type { AgentDevice, DeviceState } from '@zktalk/shared';
import {
  readDefaultDeviceId,
  subscribeDefaultDeviceId,
  writeDefaultDeviceId,
} from '@/lib/default-device';

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
    case 'degraded':
      return 'dot-busy';
    case 'suspended':
      return 'dot-offline opacity-40';
    case 'offline':
    default:
      return 'dot-offline';
  }
}

function stateKey(state: DeviceState): string {
  switch (state) {
    case 'online':
      return 'agents.device.state.online';
    case 'busy':
      return 'agents.device.state.busy';
    case 'degraded':
      return 'agents.device.state.degraded';
    case 'suspended':
      return 'agents.device.state.suspended';
    case 'offline':
    default:
      return 'agents.device.state.offline';
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

  const [defaultDeviceId, setDefaultDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDefaultDeviceId(readDefaultDeviceId());
    return subscribeDefaultDeviceId((next) => setDefaultDeviceId(next));
  }, []);

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
          {t(
            devices.length === 1 ? 'agents.device.deviceCount' : 'agents.device.devicesCount',
            { count: devices.length },
          )}
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
          {t('agents.device.dashboard')}
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
                isDefault={defaultDeviceId === device.id}
                onToggleDefault={() =>
                  writeDefaultDeviceId(defaultDeviceId === device.id ? null : device.id)
                }
              />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}

function StarIcon({ filled, className = 'h-3.5 w-3.5' }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.6}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 9.4l6.1-.9L12 3z"
      />
    </svg>
  );
}

function DeviceRow({
  device,
  isActive,
  isDefault,
  onToggleDefault,
}: {
  device: AgentDevice;
  isActive: boolean;
  isDefault: boolean;
  onToggleDefault: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="group/device-row relative">
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
            {t(stateKey(device.state))} · {device.slug}
          </span>
        </span>
        <span
          className={`h-2 w-2 shrink-0 rounded-pill ${dotClassFor(device.state)}`}
          aria-hidden="true"
        />
      </Link>
      <button
        type="button"
        data-testid={`agents-sidebar-default-${device.slug}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleDefault();
        }}
        title={isDefault ? 'Default device' : 'Set as default'}
        aria-label={isDefault ? 'Default device' : 'Set as default'}
        aria-pressed={isDefault}
        className={`absolute right-2 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded transition ${
          isDefault
            ? 'text-warning opacity-100'
            : 'text-fg-subtle opacity-0 hover:bg-bg-hover hover:text-fg group-hover/device-row:opacity-100'
        }`}
      >
        <StarIcon filled={isDefault} />
      </button>
    </li>
  );
}
