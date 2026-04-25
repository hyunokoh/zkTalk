/**
 * Default device selection — which Agent device the composer should
 * route natural-language input to when the user hasn't picked one
 * explicitly. Persists to localStorage so the choice survives reloads
 * and tab switches; cross-device sync is a follow-up (the user already
 * asked for it, see project_cross_device_settings.md).
 */

const STORAGE_KEY = 'zktalk_default_agent_device_id';

export function readDefaultDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function writeDefaultDeviceId(deviceId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (deviceId && deviceId.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, deviceId);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent('zktalk:default-device-changed', { detail: { deviceId } }),
    );
  } catch {
    // Storage may be disabled (private mode) — silently ignore; the user
    // can re-pick on next page.
  }
}

/**
 * Subscribe to changes from any tab/component. Returns an unsubscribe.
 */
export function subscribeDefaultDeviceId(
  listener: (deviceId: string | null) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ deviceId: string | null }>).detail;
    listener(detail?.deviceId ?? null);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(event.newValue && event.newValue.length > 0 ? event.newValue : null);
    }
  };
  window.addEventListener('zktalk:default-device-changed', onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('zktalk:default-device-changed', onCustom);
    window.removeEventListener('storage', onStorage);
  };
}
