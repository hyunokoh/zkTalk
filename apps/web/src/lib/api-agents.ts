import { api } from '@/lib/api';
import type {
  AgentDevice,
  CommandExecution,
  DeviceAgent,
  DeviceHeartbeatSummary,
  QueueCommandInput,
  RegisterAgentDeviceInput,
  RegisterDeviceAgentInput,
} from '@zktalk/shared';

export interface ListDevicesResponse {
  devices: AgentDevice[];
  agentsByDevice: Record<string, DeviceAgent[]>;
}

export function fetchDevices(): Promise<ListDevicesResponse> {
  return api<ListDevicesResponse>('/api/devices');
}

export async function registerDevice(input: RegisterAgentDeviceInput): Promise<AgentDevice> {
  const res = await api<{ device: AgentDevice }>('/api/devices', {
    method: 'POST',
    body: input,
  });
  return res.device;
}

export async function updateDevice(
  deviceId: string,
  patch: {
    name?: string;
    sharedWithCommunityId?: string | null;
    sharedAllowedRoleIds?: string[];
  },
): Promise<AgentDevice> {
  const res = await api<{ device: AgentDevice }>(`/api/devices/${deviceId}`, {
    method: 'PATCH',
    body: patch,
  });
  return res.device;
}

export async function deleteDevice(deviceId: string): Promise<void> {
  await api(`/api/devices/${deviceId}`, { method: 'DELETE' });
}

export async function sendHeartbeat(
  deviceId: string,
  payload: DeviceHeartbeatSummary,
): Promise<AgentDevice> {
  const res = await api<{ device: AgentDevice }>(`/api/devices/${deviceId}/heartbeat`, {
    method: 'POST',
    body: payload,
  });
  return res.device;
}

export async function fetchDeviceAgents(deviceId: string): Promise<DeviceAgent[]> {
  const res = await api<{ agents: DeviceAgent[] }>(`/api/devices/${deviceId}/agents`);
  return res.agents;
}

export async function registerDeviceAgent(
  deviceId: string,
  input: RegisterDeviceAgentInput,
): Promise<DeviceAgent> {
  const res = await api<{ agent: DeviceAgent }>(`/api/devices/${deviceId}/agents`, {
    method: 'POST',
    body: input,
  });
  return res.agent;
}

export async function fetchCommands(
  opts: { deviceId?: string; limit?: number } = {},
): Promise<CommandExecution[]> {
  const params = new URLSearchParams();
  if (opts.deviceId) params.set('deviceId', opts.deviceId);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await api<{ commands: CommandExecution[] }>(
    `/api/commands${qs ? `?${qs}` : ''}`,
  );
  return res.commands;
}

export async function queueCommand(input: QueueCommandInput): Promise<CommandExecution> {
  const res = await api<{ command: CommandExecution }>('/api/commands', {
    method: 'POST',
    body: input,
  });
  return res.command;
}

export async function fetchCommand(commandId: string): Promise<CommandExecution> {
  const res = await api<{ command: CommandExecution }>(`/api/commands/${commandId}`);
  return res.command;
}

export async function decideCommand(
  commandId: string,
  decision: 'approved' | 'rejected',
): Promise<CommandExecution> {
  const res = await api<{ command: CommandExecution }>(
    `/api/commands/${commandId}/decision`,
    { method: 'POST', body: { decision } },
  );
  return res.command;
}
