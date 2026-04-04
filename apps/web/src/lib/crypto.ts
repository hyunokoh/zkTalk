/**
 * E2EE Crypto utilities for DM conversations.
 *
 * Uses Web Crypto API (SubtleCrypto) — no external libraries.
 * - ECDH P-256 for key exchange
 * - HKDF for key derivation
 * - AES-GCM (256-bit key, 12-byte nonce) for encryption
 * - Private keys stored in IndexedDB (never sent to server)
 * - Public keys stored as base64-encoded JWK
 */

// ── Constants ────────────────────────────────────────────────────────

const DB_NAME = 'zktalk-e2ee';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const NONCE_LENGTH = 12; // 12 bytes for AES-GCM IV

// ── IndexedDB Helpers ────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storePrivateKey(userId: string, privateKeyJwk: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(privateKeyJwk, `private:${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPrivateKey(userId: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(`private:${userId}`);
    request.onsuccess = () => resolve((request.result as string) ?? null);
    request.onerror = () => reject(request.error);
  });
}

// ── Key Generation ───────────────────────────────────────────────────

export async function generateKeyPair(): Promise<{
  publicKey: string; // base64-encoded JWK
  privateKey: string; // base64-encoded JWK
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable
    ['deriveKey', 'deriveBits'],
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return {
    publicKey: btoa(JSON.stringify(publicJwk)),
    privateKey: btoa(JSON.stringify(privateJwk)),
  };
}

// ── Shared Secret Derivation ─────────────────────────────────────────

export async function deriveSharedSecret(
  privateKeyBase64: string,
  otherPublicKeyBase64: string,
): Promise<CryptoKey> {
  const privateJwk = JSON.parse(atob(privateKeyBase64)) as JsonWebKey;
  const publicJwk = JSON.parse(atob(otherPublicKeyBase64)) as JsonWebKey;

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  );

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // Derive raw bits via ECDH
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256,
  );

  // Use HKDF to derive an AES-GCM key from the shared bits
  const hkdfKey = await crypto.subtle.importKey(
    'raw',
    sharedBits,
    'HKDF',
    false,
    ['deriveKey'],
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode('zktalk-e2ee-salt'),
      info: new TextEncoder().encode('zktalk-e2ee-aes-gcm'),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  return aesKey;
}

// ── Encryption / Decryption ──────────────────────────────────────────

export async function encrypt(
  plaintext: string,
  sharedSecret: CryptoKey,
): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    sharedSecret,
    encoded,
  );

  // Prepend nonce to ciphertext, then base64-encode everything
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(
  ciphertextBase64: string,
  sharedSecret: CryptoKey,
): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));

  const nonce = combined.slice(0, NONCE_LENGTH);
  const ciphertext = combined.slice(NONCE_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    sharedSecret,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
