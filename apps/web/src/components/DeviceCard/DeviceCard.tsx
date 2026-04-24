'use client';

import Link from 'next/link';
import type { AgentDevice, DeviceAgent, DeviceState } from '@zktalk/shared';

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

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export interface DeviceCardProps {
  device: AgentDevice;
  agents: DeviceAgent[];
}

export function DeviceCard({ device, agents }: DeviceCardProps) {
  const heartbeat = device.heartbeat;
  const cpuPct = heartbeat ? Math.round(heartbeat.cpu * 100) : null;
  const ramUsed = heartbeat ? formatBytes(heartbeat.ramUsed) : null;
  const ramTotal = heartbeat ? formatBytes(heartbeat.ramTotal) : null;
  const ramPct = heartbeat && heartbeat.ramTotal > 0
    ? Math.round((heartbeat.ramUsed / heartbeat.ramTotal) * 100)
    : null;

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
          </div>
          <p className="truncate text-[12px] text-fg-muted">
            {stateLabel(device.state)} · {device.platform} · /{device.slug}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">CPU</span>
          <span className="font-medium text-fg">
            {cpuPct === null ? '—' : `${cpuPct}%`}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">RAM</span>
          <span className="font-medium text-fg">
            {ramUsed && ramTotal
              ? `${ramUsed} / ${ramTotal}${ramPct !== null ? ` (${ramPct}%)` : ''}`
              : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">Agents</span>
          <span className="font-medium text-fg">{agents.length}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-fg-subtle">Heartbeat</span>
          <span className="font-medium text-fg">
            {formatRelative(device.lastHeartbeatAt)}
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
