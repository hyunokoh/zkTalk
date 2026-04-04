/**
 * Sealed Sender — metadata-minimization layer.
 *
 * The idea (inspired by Signal's Sealed Sender):
 *  - The sender encrypts their identity + message content into a single blob.
 *  - The server stores the blob and delivers it by channel subscription.
 *  - The server sees: channelId, timestamp, encrypted blob — but NOT the sender.
 *  - Recipients decrypt the blob to reveal who actually sent the message.
 *
 * Uses the existing AES-GCM encrypt/decrypt from `@/lib/crypto`.
 */

import { encrypt, decrypt } from './crypto';

// ── Types ────────────────────────────────────────────────────────────

export interface SealedMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

// ── Envelope creation / opening ──────────────────────────────────────

/**
 * Create a sealed envelope: encrypt sender info + content together.
 *
 * @param message  The plaintext message with sender identity
 * @param groupKey The channel group key or DM shared secret (AES-GCM CryptoKey)
 * @returns        Base64-encoded encrypted blob
 */
export async function createSealedEnvelope(
  message: SealedMessage,
  groupKey: CryptoKey,
): Promise<string> {
  const payload = JSON.stringify(message);
  return encrypt(payload, groupKey);
}

/**
 * Open a sealed envelope: decrypt to get sender + content.
 *
 * @param encryptedPayload  Base64-encoded encrypted blob from the server
 * @param groupKey          The channel group key or DM shared secret
 * @returns                 The decrypted SealedMessage
 */
export async function openSealedEnvelope(
  encryptedPayload: string,
  groupKey: CryptoKey,
): Promise<SealedMessage> {
  const json = await decrypt(encryptedPayload, groupKey);
  return JSON.parse(json) as SealedMessage;
}

// ── Symmetric group key helpers ──────────────────────────────────────

/**
 * Generate a new AES-GCM-256 group key for a channel.
 * In production, this would be distributed to members via key exchange.
 */
export async function generateGroupKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Export a CryptoKey to a base64-encoded JWK for storage / distribution.
 */
export async function exportGroupKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return btoa(JSON.stringify(jwk));
}

/**
 * Import a base64-encoded JWK back into a CryptoKey.
 */
export async function importGroupKey(base64Jwk: string): Promise<CryptoKey> {
  const jwk = JSON.parse(atob(base64Jwk)) as JsonWebKey;
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

// ── Local preferences ────────────────────────────────────────────────

const SEALED_SENDER_KEY = 'zktalk-sealed-sender-enabled';

/**
 * Check if sealed sender mode is enabled (persisted in localStorage).
 */
export function isSealedSenderEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SEALED_SENDER_KEY) === 'true';
}

/**
 * Toggle sealed sender mode on/off.
 */
export function setSealedSenderEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEALED_SENDER_KEY, String(enabled));
}
