'use client';

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

export interface DeviceStatusStripProps {
  device: AgentDevice;
  agents: DeviceAgent[];
}

/**
 * Thin 32px status bar pinned to the top of the Agent 1:1 DM.
 *
 * Design reference: docs/ui-design/mockups.html (Agent 1:1 DM §"device-status-strip")
 */
export function DeviceStatusStrip({ device, agents }: DeviceStatusStripProps) {
  const heartbeat = device.heartbeat;
  const cpuPct = heartbeat ? Math.round(heartbeat.cpu * 100) : null;
  const ramPct = heartbeat && heartbeat.ramTotal > 0
    ? Math.round((heartbeat.ramUsed / heartbeat.ramTotal) * 100)
    : null;
  const ramUsed = heartbeat ? formatBytes(heartbeat.ramUsed) : null;

  return (
    <div
      data-testid="device-status-strip"
      className="flex h-8 items-center gap-4 border-b border-line bg-bg-subtle px-4 text-[11px] text-fg-muted"
    >
      <span className="flex items-center gap-1.5 font-medium text-fg">
        <span
          className={`h-1.5 w-1.5 rounded-pill ${dotClassFor(device.state)}`}
          aria-hidden="true"
        />
        {stateLabel(device.state)}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span className="tabular-nums">
        CPU {cpuPct === null ? '—' : `${cpuPct}%`}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span className="tabular-nums">
        RAM {ramPct === null ? '—' : `${ramPct}%`}
        {ramUsed ? ` (${ramUsed})` : ''}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span>
        {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
      </span>

      <span className="ml-auto text-fg-subtle">
        heartbeat {formatRelative(device.lastHeartbeatAt)}
      </span>
    </div>
  );
}
