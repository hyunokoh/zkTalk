'use client';

import type { AgentDevice, DeviceAgent, DeviceState } from '@zktalk/shared';
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
  const { t } = useTranslation();
  const heartbeat = device.heartbeat;
  const cpuPct = heartbeat ? Math.round(heartbeat.cpu * 100) : null;
  const ramPct = heartbeat && heartbeat.ramTotal > 0
    ? Math.round((heartbeat.ramUsed / heartbeat.ramTotal) * 100)
    : null;
  const ramUsed = heartbeat ? formatBytes(heartbeat.ramUsed) : null;
  const dash = t('agents.device.dash');

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
        {t(stateKey(device.state))}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span className="tabular-nums">
        {t('agents.device.cpu')} {cpuPct === null ? dash : `${cpuPct}%`}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span className="tabular-nums">
        {t('agents.device.ram')} {ramPct === null ? dash : `${ramPct}%`}
        {ramUsed ? ` (${ramUsed})` : ''}
      </span>

      <span aria-hidden="true" className="text-fg-subtle">·</span>

      <span>
        {t(
          agents.length === 1 ? 'agents.device.agentCount' : 'agents.device.agentsCount',
          { count: agents.length },
        )}
      </span>

      <span className="ml-auto text-fg-subtle">
        {t('agents.device.heartbeatPrefix', {
          value: formatRelative(device.lastHeartbeatAt, t),
        })}
      </span>
    </div>
  );
}
