'use client';

/**
 * /agents/[deviceId] — Phase 9B Agent 1:1 DM.
 *
 * Layout:
 *   [AgentDeviceSidebar] | [DeviceStatusStrip]
 *                        | [command feed]
 *                        | [CommandComposer]
 *
 * Auth gating is handled upstream by the (app) route group layout.
 * The `me` query is used only to decide whether to show the approval bar.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CommandExecution } from '@zktalk/shared';
import {
  fetchCommands,
  fetchDeviceAgents,
  fetchDevices,
  type ListDevicesResponse,
} from '@/lib/api-agents';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import { AgentDeviceSidebar } from '@/components/AgentDeviceSidebar';
import { DeviceStatusStrip } from '@/components/DeviceStatusStrip';
import { CommandComposer } from '@/components/CommandComposer';
import { CommandResultBubble } from '@/components/CommandResultBubble';
import { DeviceNameEditor } from '@/components/DeviceNameEditor';
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

export default function AgentDevicePage() {
  const params = useParams<{ deviceId: string }>();
  const deviceId = params?.deviceId ?? '';
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);

  const devicesQuery = useQuery<ListDevicesResponse>({
    queryKey: ['agent-devices'],
    queryFn: fetchDevices,
    staleTime: 15_000,
  });

  const agentsQuery = useQuery({
    queryKey: ['device-agents', deviceId],
    queryFn: () => fetchDeviceAgents(deviceId),
    enabled: Boolean(deviceId),
    staleTime: 15_000,
  });

  const commandsQuery = useQuery<CommandExecution[]>({
    queryKey: ['agent-commands', deviceId],
    queryFn: () => fetchCommands({ deviceId, limit: 100 }),
    enabled: Boolean(deviceId),
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const device = useMemo(
    () => devicesQuery.data?.devices.find((d) => d.id === deviceId) ?? null,
    [devicesQuery.data?.devices, deviceId],
  );

  const [defaultDeviceId, setDefaultDeviceId] = useState<string | null>(null);
  useEffect(() => {
    setDefaultDeviceId(readDefaultDeviceId());
    return subscribeDefaultDeviceId((next) => setDefaultDeviceId(next));
  }, []);
  const isDefaultDevice = device ? defaultDeviceId === device.id : false;

  const agents = agentsQuery.data ?? devicesQuery.data?.agentsByDevice[deviceId] ?? [];
  const commands = commandsQuery.data ?? [];
  const canApprove = Boolean(device && currentUser && device.userId === currentUser.id);

  // Commands API returns most-recent-first; flip for chat-style bottom-anchored display.
  const orderedCommands = useMemo(
    () => [...commands].reverse(),
    [commands],
  );

  if (devicesQuery.isLoading) {
    return (
      <section className="flex min-h-0 flex-1 bg-bg text-fg">
        <AgentDeviceSidebar activeDeviceId={deviceId} />
        <div className="flex min-h-0 flex-1 items-center justify-center text-[13px] text-fg-muted">
          Loading…
        </div>
      </section>
    );
  }

  if (!device) {
    return (
      <section className="flex min-h-0 flex-1 bg-bg text-fg">
        <AgentDeviceSidebar activeDeviceId={deviceId} />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
          <p className="text-[14px] font-semibold text-fg">Device not found</p>
          <p className="max-w-[380px] text-center text-[13px] text-fg-muted">
            It may have been removed, or you may not have access to it.
          </p>
          <Link
            href="/agents"
            className="inline-flex h-9 items-center rounded-md border border-line px-3 text-[13px] font-medium text-fg-muted hover:border-line-strong hover:text-fg"
          >
            Back to devices
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="agent-device-page"
      className="flex min-h-0 flex-1 bg-bg text-fg"
    >
      <AgentDeviceSidebar activeDeviceId={deviceId} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-bg px-6">
          <span className="agent-pill">
            <DiamondMark />
            <DeviceNameEditor device={device} canEdit={canApprove} />
          </span>
          <span className="text-[13px] text-fg-muted">
            {t('agents.title')} · /{device.slug}
          </span>
          {canApprove ? (
            <button
              type="button"
              data-testid="agents-page-set-default"
              onClick={() => writeDefaultDeviceId(isDefaultDevice ? null : device.id)}
              aria-pressed={isDefaultDevice}
              className={`ml-auto rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                isDefaultDevice
                  ? 'bg-warning/20 text-warning hover:bg-warning/30'
                  : 'border border-line text-fg-muted hover:bg-bg-hover hover:text-fg'
              }`}
            >
              {isDefaultDevice ? '★ Default device' : 'Set as default'}
            </button>
          ) : null}
        </header>

        <DeviceStatusStrip device={device} agents={agents} />

        <div
          data-testid="agent-device-feed"
          className="flex min-h-0 flex-1 flex-col-reverse gap-2 overflow-auto px-4 py-4"
        >
          {orderedCommands.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="max-w-[360px] text-center text-[13px] text-fg-muted">
                No commands yet. Try{' '}
                <code className="rounded-sm bg-bg-hover px-1 py-0.5 font-mono text-[12px] text-fg">
                  /{device.slug}.shell ls
                </code>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {orderedCommands.map((cmd) => (
                <CommandResultBubble key={cmd.id} command={cmd} canApprove={canApprove} />
              ))}
            </div>
          )}
        </div>

        <CommandComposer device={device} agents={agents} />
      </div>
    </section>
  );
}
