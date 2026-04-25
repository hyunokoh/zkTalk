'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { AgentDevice, DeviceAgent, DeviceState } from '@zktalk/shared';
import {
  readDefaultDeviceId,
  subscribeDefaultDeviceId,
  writeDefaultDeviceId,
} from '@/lib/default-device';
import { useTranslation } from '@/lib/i18n';

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

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

function formatRelative(iso: string | null, t: Translator): string {
  if (!iso) return t('agents.device.dash');
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return t('agents.device.dash');
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return t('agents.device.justNow');
  if (mins < 60) return t('agents.device.minutesAgo', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('agents.device.hoursAgo', { count: hours });
  const days = Math.round(hours / 24);
  return t('agents.device.daysAgo', { count: days });
}

export interface DeviceCardProps {
  device: AgentDevice;
  agents: DeviceAgent[];
}

export function DeviceCard({ device, agents }: DeviceCardProps) {
  const { t } = useTranslation();
  const heartbeat = device.heartbeat;
  const cpuPct = heartbeat ? Math.round(heartbeat.cpu * 100) : null;
  const ramUsed = heartbeat ? formatBytes(heartbeat.ramUsed) : null;
  const ramTotal = heartbeat ? formatBytes(heartbeat.ramTotal) : null;
  const ramPct = heartbeat && heartbeat.ramTotal > 0
    ? Math.round((heartbeat.ramUsed / heartbeat.ramTotal) * 100)
    : null;
  const dash = t('agents.device.dash');

  const [defaultDeviceId, setDefaultDeviceId] = useState<string | null>(null);
  useEffect(() => {
    setDefaultDeviceId(readDefaultDeviceId());
    return subscribeDefaultDeviceId((next) => setDefaultDeviceId(next));
  }, []);
  const isDefault = defaultDeviceId === device.id;

  return (
    <Link
      href={`/agents/${device.id}`}
      data-testid={`device-card-${device.slug}`}
      className="group relative flex flex-col gap-3 rounded-lg border border-line bg-bg-elevated p-4 transition hover:border-line-strong hover:shadow-[var(--shadow-2)]"
    >
      <header className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-hover text-[13px] font-semibold uppercase tracking-wide text-fg-muted"
          aria-hidden="true"
        >
          {device.slug.slice(0, 2)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold text-fg">
              {device.name}
            </h3>
            <span
              className={`h-2 w-2 shrink-0 rounded-pill ${dotClassFor(device.state)}`}
              aria-hidden="true"
            />
            {isDefault ? (
              <span
                data-testid={`device-card-default-${device.slug}`}
                className="rounded-pill bg-warning/20 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning"
                title={t('agents.device.defaultDevice')}
              >
                ★ {t('agents.device.defaultDevice')}
              </span>
            ) : null}
          </div>
          <p className="truncate text-[12px] text-fg-muted">
            {t(stateKey(device.state))} · {device.platform} · /{device.slug}
          </p>
        </div>
        <button
          type="button"
          data-testid={`device-card-set-default-${device.slug}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            writeDefaultDeviceId(isDefault ? null : device.id);
          }}
          aria-label={t(isDefault ? 'agents.device.unpinAria' : 'agents.device.pinAria')}
          aria-pressed={isDefault}
          className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
            isDefault
              ? 'bg-warning/20 text-warning hover:bg-warning/30'
              : 'text-fg-subtle opacity-0 hover:bg-bg-hover hover:text-fg group-hover:opacity-100'
          }`}
        >
          {t(isDefault ? 'agents.device.pinned' : 'agents.device.pin')}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">{t('agents.device.cpu')}</span>
          <span className="font-medium text-fg">
            {cpuPct === null ? dash : `${cpuPct}%`}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">{t('agents.device.ram')}</span>
          <span className="font-medium text-fg">
            {ramUsed && ramTotal
              ? `${ramUsed} / ${ramTotal}${ramPct !== null ? ` (${ramPct}%)` : ''}`
              : dash}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">{t('agents.device.agentsLabel')}</span>
          <span className="font-medium text-fg">{agents.length}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">{t('agents.device.heartbeat')}</span>
          <span className="font-medium text-fg">
            {formatRelative(device.lastHeartbeatAt, t)}
          </span>
        </div>
      </div>

      {agents.length > 0 && (
        <footer className="flex flex-wrap gap-1.5 border-t border-line pt-3">
          {agents.slice(0, 6).map((agent) => (
            <span
              key={agent.id}
              className="inline-flex items-center gap-1 rounded-pill bg-bg-hover px-2 py-0.5 text-[11px] font-medium text-fg-muted"
            >
              <span className="h-1.5 w-1.5 rounded-pill bg-agent" aria-hidden="true" />
              {agent.agentSlug}
              {agent.version ? (
                <span className="text-fg-subtle">@{agent.version}</span>
              ) : null}
            </span>
          ))}
          {agents.length > 6 && (
            <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] text-fg-subtle">
              +{agents.length - 6}
            </span>
          )}
        </footer>
      )}
    </Link>
  );
}
