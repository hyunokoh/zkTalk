import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as LegacyFileSystem from 'expo-file-system/legacy';

function parseSimulatorHarnessFlag(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

const configuredSimulatorHarnessFlag =
  parseSimulatorHarnessFlag(process.env.EXPO_PUBLIC_ENABLE_SIMULATOR_HARNESS) ??
  parseSimulatorHarnessFlag(Constants.expoConfig?.extra?.enableSimulatorHarness);

export const isSimulatorHarnessEnabled =
  !Device.isDevice &&
  configuredSimulatorHarnessFlag !== false;

export const simulatorHarnessDirectory = isSimulatorHarnessEnabled
  ? LegacyFileSystem.documentDirectory ?? null
  : null;

export function getSimulatorHarnessPath(filename: string): string | null {
  return simulatorHarnessDirectory ? `${simulatorHarnessDirectory}${filename}` : null;
}

export async function readSimulatorHarnessFile(filename: string): Promise<string> {
  const path = getSimulatorHarnessPath(filename);
  if (!path) {
    return '';
  }

  return LegacyFileSystem.readAsStringAsync(path).catch(() => '');
}

export async function readSimulatorHarnessJson<T>(filename: string): Promise<T | null> {
  const raw = await readSimulatorHarnessFile(filename);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeSimulatorHarnessFile(
  filename: string,
  contents: string,
): Promise<void> {
  const path = getSimulatorHarnessPath(filename);
  if (!path) {
    return;
  }

  await LegacyFileSystem.writeAsStringAsync(path, contents).catch(() => {});
}

export async function writeSimulatorHarnessJson(
  filename: string,
  payload: unknown,
  pretty = false,
): Promise<void> {
  await writeSimulatorHarnessFile(
    filename,
    JSON.stringify(payload, null, pretty ? 2 : undefined),
  );
}

export async function deleteSimulatorHarnessFile(filename: string): Promise<void> {
  const path = getSimulatorHarnessPath(filename);
  await deleteSimulatorHarnessPath(path);
}

export async function deleteSimulatorHarnessPath(path: string | null): Promise<void> {
  if (!path) {
    return;
  }

  await LegacyFileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
}

export async function claimSimulatorHarnessMarker(
  filename: string,
  markerValue: string,
): Promise<boolean> {
  const currentValue = await readSimulatorHarnessFile(filename);
  if (currentValue === markerValue) {
    return false;
  }

  await writeSimulatorHarnessFile(filename, markerValue);
  return true;
}
