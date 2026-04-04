// ── Notification preferences (persisted in localStorage) ──────────

const PREFS_KEY = 'zktalk-notification-prefs';

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  dm: boolean;
  mention: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  sound: true,
  dm: true,
  mention: true,
};

export function getNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) } as NotificationPreferences;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setNotificationPrefs(prefs: Partial<NotificationPreferences>): void {
  if (typeof window === 'undefined') return;
  const current = getNotificationPrefs();
  const merged = { ...current, ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
}

// ── Permission handling ───────────────────────────────────────────

export function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!('Notification' in window)) return Promise.resolve(null);
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function canNotify(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && Notification.permission === 'granted';
}

// ── Notification sound ────────────────────────────────────────────

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a short notification beep using the Web Audio API.
 * This avoids needing an external audio file.
 */
export function playNotificationSound(): void {
  const prefs = getNotificationPrefs();
  if (!prefs.sound) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1); // E5 note

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail if audio context is not available
  }
}

// ── Show notification ──────────────────────────────────────────────

export type NotificationPriority = 'normal' | 'high';

export interface ShowNotificationOptions {
  title: string;
  body: string;
  onClick?: () => void;
  priority?: NotificationPriority;
  /** If true, skip the document.hasFocus() check (e.g., for DMs) */
  alwaysShow?: boolean;
}

export function showNotification(options: ShowNotificationOptions): void {
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return;
  if (!canNotify()) return;

  const { title, body, onClick, alwaysShow } = options;

  // Don't notify if window is focused unless alwaysShow is set
  if (!alwaysShow && document.hasFocus()) return;

  playNotificationSound();

  const notification = new Notification(title, {
    body,
    icon: '/icon.png',
    tag: `zktalk-${Date.now()}`,
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

// ── Legacy overload for backward compat ────────────────────────────

export function showSimpleNotification(
  title: string,
  body: string,
  onClick?: () => void,
): void {
  showNotification({ title, body, onClick });
}
