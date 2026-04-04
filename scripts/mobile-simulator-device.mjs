import { execFileSync } from 'node:child_process';

function simctl(parts, options = {}) {
  return execFileSync('xcrun', ['simctl', ...parts], {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function listDevices() {
  const payload = JSON.parse(simctl(['list', 'devices', '--json']));
  return Object.values(payload.devices ?? {}).flatMap((entries) =>
    Array.isArray(entries) ? entries : [],
  );
}

export function listBootedDevices() {
  return listDevices()
    .filter((device) => device?.state === 'Booted' && device?.isAvailable !== false)
    .sort((left, right) => {
      const leftBootedAt = Date.parse(left?.lastBootedAt ?? 0);
      const rightBootedAt = Date.parse(right?.lastBootedAt ?? 0);
      return rightBootedAt - leftBootedAt;
    });
}

function isIPhoneDevice(device) {
  const name = `${device?.name ?? ''} ${device?.deviceTypeIdentifier ?? ''}`.toLowerCase();
  return name.includes('iphone');
}

function isUuid(value) {
  return /^[0-9A-F-]{36}$/i.test(value);
}

function hasInstalledBundle(udid, bundleId) {
  try {
    execFileSync('xcrun', ['simctl', 'get_app_container', udid, bundleId, 'data'], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function shutdownOtherBootedSimulators(targetUdid) {
  const otherBootedDevices = listBootedDevices().filter((device) => device.udid !== targetUdid);

  if (otherBootedDevices.length === 0) {
    return [];
  }

  for (const device of otherBootedDevices) {
    try {
      execFileSync('xcrun', ['simctl', 'shutdown', device.udid], { stdio: 'ignore' });
    } catch {
      // Ignore shutdown races while CoreSimulator reconciles boot state.
    }
  }

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const remainingBootedOthers = listBootedDevices().filter((device) => device.udid !== targetUdid);
    if (remainingBootedOthers.length === 0) {
      break;
    }
    sleepMs(250);
  }

  return otherBootedDevices.map((device) => ({
    udid: device.udid,
    name: device.name ?? '',
    runtime: device.runtime ?? '',
  }));
}

function resolveNamedDevice(requestedDevice) {
  const devices = listDevices().filter((device) => device?.isAvailable !== false);

  if (isUuid(requestedDevice)) {
    return requestedDevice;
  }

  const exactMatch = devices.find((device) => device?.name === requestedDevice);
  if (exactMatch?.udid) {
    return exactMatch.udid;
  }

  const partialMatch = devices.find((device) =>
    `${device?.name ?? ''}`.toLowerCase().includes(requestedDevice.toLowerCase()),
  );
  if (partialMatch?.udid) {
    return partialMatch.udid;
  }

  throw new Error(`Could not find an iOS simulator matching "${requestedDevice}".`);
}

export function resolveSimulatorDevice(requestedDevice, bundleId) {
  if (requestedDevice && requestedDevice !== 'booted') {
    return resolveNamedDevice(requestedDevice);
  }

  const bootedDevices = listBootedDevices();
  if (bootedDevices.length === 0) {
    throw new Error('No booted iOS simulators are available.');
  }

  const installedMatch = bundleId
    ? bootedDevices.find((device) => hasInstalledBundle(device.udid, bundleId))
    : null;
  if (installedMatch?.udid) {
    return installedMatch.udid;
  }

  const preferredIPhone = bootedDevices.find((device) => isIPhoneDevice(device));
  return preferredIPhone?.udid ?? bootedDevices[0].udid;
}
