export const colors = {
  // Legacy aliases (keep for backward compatibility)
  bg: '#0a0a1a',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
  text: '#f1f1f1',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  border: '#374151',
  borderLight: '#2a2a4a',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',

  // Extended palette
  background: '#0f0f23',
  backgroundDark: '#0a0a1a',
  surfaceHover: '#22223a',

  // Brand
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',

  // Text (extended)
  textPrimary: '#ffffff',
  textDim: '#555566',

  // Accents
  error: '#ef4444',
  info: '#3b82f6',

  // Message bubbles
  ownMessageBg: '#2a2a5a',
  ownMessageBorder: '#4f46e5',
  otherMessageBg: '#1a1a2e',

  // Discord-like talk surfaces with Kakao-style message structure
  talkBackground: '#36393f',
  talkPanel: '#313338',
  talkPanelBorder: '#202225',
  talkOwnBubble: '#5865f2',
  talkOwnBubbleBorder: '#4752c4',
  talkOtherBubble: '#40444b',
  talkOtherBubbleBorder: '#4f545c',
  talkMeta: '#b5bac1',
  talkSubtle: '#8e9297',
  talkAction: '#40444b',

  // Online indicator
  online: '#22c55e',
  offline: '#555566',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ColorName = keyof typeof colors;

/**
 * Generate a deterministic color from a string (for avatar backgrounds).
 */
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#2563eb',
];

export function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
