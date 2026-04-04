import * as Crypto from 'expo-crypto';
import { getE2eeKeyPair, storeE2eeKeyPair } from './secure-storage';
import { api } from './api';

// ---------------------------------------------------------------------------
// E2EE Crypto helpers for DM encryption
//
// MVP approach:
// - Uses SubtleCrypto (available in modern RN/Hermes via expo-crypto polyfill)
// - AES-256-GCM for message encryption
// - ECDH P-256 for key exchange
// - Keys stored in SecureStore (iOS Keychain / Android Keystore)
// ---------------------------------------------------------------------------

// Generate a random AES key as a hex string (for channel group keys)
export async function generateAesKey(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return bytesToHex(bytes);
}

// Generate a random IV for AES-GCM
async function generateIv(): Promise<Uint8Array> {
  return await Crypto.getRandomBytesAsync(12);
}

// SHA-256 hash
export async function sha256(data: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data,
  );
}

// ---------------------------------------------------------------------------
// Key generation and management
// ---------------------------------------------------------------------------

function getSubtleCrypto(): SubtleCrypto | null {
  return typeof globalThis.crypto !== 'undefined' && globalThis.crypto?.subtle
    ? globalThis.crypto.subtle
    : null;
}

export function isE2eeSupported(): boolean {
  return getSubtleCrypto() !== null;
}

/**
 * Generate an ECDH key pair and store in secure storage.
 * Returns the public key as a base64 string for sharing with server.
 */
export async function generateKeyPair(): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    if (!subtle) {
      throw new Error('Web Crypto is not available in this runtime');
    }

    const keyPair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );

    const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyJwk = await subtle.exportKey('jwk', keyPair.privateKey);

    const publicKeyBase64 = arrayBufferToBase64(publicKeyRaw);
    const privateKeyJson = JSON.stringify(privateKeyJwk);

    await storeE2eeKeyPair(privateKeyJson, publicKeyBase64);

    return publicKeyBase64;
  } catch (error) {
    console.error('[Crypto] Key generation failed:', error);
    throw new Error('Failed to generate E2EE key pair');
  }
}

/**
 * Ensure we have a key pair. Generate one if not present.
 * Registers the public key with the server.
 */
export async function ensureKeyPair(): Promise<string> {
  const existing = await getE2eeKeyPair();
  if (existing) return existing.publicKey;

  const publicKey = await generateKeyPair();

  // Register public key with server
  try {
    await api('/api/me/keys', {
      method: 'PUT',
      body: { publicKey },
    });
  } catch (error) {
    console.warn('[Crypto] Failed to register public key:', error);
  }

  return publicKey;
}

// ---------------------------------------------------------------------------
// Message encryption / decryption (AES-GCM)
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext message with a shared key (hex string).
 * Returns a JSON string containing { iv, ciphertext } both base64-encoded.
 */
export async function encryptMessage(
  plaintext: string,
  keyHex: string,
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    if (!subtle) {
      throw new Error('Web Crypto is not available in this runtime');
    }

    const keyBytes = hexToBytes(keyHex);
    const cryptoKey = await subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    );

    const iv = await generateIv();
    const encodedText = new TextEncoder().encode(plaintext);

    const ciphertextBuffer = await subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      encodedText.buffer as ArrayBuffer,
    );

    return JSON.stringify({
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      ciphertext: arrayBufferToBase64(ciphertextBuffer),
    });
  } catch (error) {
    console.error('[Crypto] Encryption failed:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt an encrypted message payload using a shared key (hex string).
 * Expects a JSON string with { iv, ciphertext } both base64-encoded.
 */
export async function decryptMessage(
  encryptedPayload: string,
  keyHex: string,
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    if (!subtle) {
      throw new Error('Web Crypto is not available in this runtime');
    }

    const { iv: ivBase64, ciphertext: ciphertextBase64 } = JSON.parse(encryptedPayload);

    const keyBytes = hexToBytes(keyHex);
    const cryptoKey = await subtle.importKey(
      'raw',
      keyBytes.buffer as ArrayBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );

    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);

    const decryptedBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      ciphertext,
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    throw new Error('Failed to decrypt message');
  }
}

// ---------------------------------------------------------------------------
// ECDH shared secret derivation
// ---------------------------------------------------------------------------

/**
 * Derive a shared AES key from our private key and the other party's public key.
 */
export async function deriveSharedKey(
  privateKeyJson: string,
  otherPublicKeyBase64: string,
): Promise<string> {
  try {
    const subtle = getSubtleCrypto();
    if (!subtle) {
      throw new Error('Web Crypto is not available in this runtime');
    }

    const privateKeyJwk = JSON.parse(privateKeyJson);
    const privateKey = await subtle.importKey(
      'jwk',
      privateKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    );

    const otherPublicKeyBuffer = new Uint8Array(base64ToArrayBuffer(otherPublicKeyBase64));
    const otherPublicKey = await subtle.importKey(
      'raw',
      otherPublicKeyBuffer.buffer as ArrayBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );

    const sharedBits = await subtle.deriveBits(
      { name: 'ECDH', public: otherPublicKey },
      privateKey,
      256,
    );

    return bytesToHex(new Uint8Array(sharedBits));
  } catch (error) {
    console.error('[Crypto] Key derivation failed:', error);
    throw new Error('Failed to derive shared key');
  }
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
