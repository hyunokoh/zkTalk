import crypto from 'node:crypto';
import { AppError } from '../../lib/errors.js';
import * as repo from './api-key.repository.js';
import { isValidScope, type ApiKeyScope } from './api-key.scopes.js';

const KEY_PREFIX = 'zk_live_';
const SECRET_BYTES = 32; // 256-bit secret

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export interface IssuedApiKey {
  id: string;
  name: string;
  scopes: string[];
  keyPrefix: string; // shown in lists
  plaintextKey: string; // shown ONCE at creation only
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyView {
  id: string;
  name: string;
  scopes: string[];
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

function rowToView(row: repo.ApiKeyRow): ApiKeyView {
  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

export async function createKey(
  userId: string,
  input: { name: string; scopes: string[]; expiresAt?: Date | null },
): Promise<IssuedApiKey> {
  const name = input.name.trim();
  if (!name) throw AppError.badRequest('Name is required');
  if (name.length > 64) throw AppError.badRequest('Name too long');

  const scopes: ApiKeyScope[] = [];
  for (const s of input.scopes) {
    if (!isValidScope(s)) throw AppError.badRequest(`Unknown scope: ${s}`);
    scopes.push(s);
  }
  if (scopes.length === 0) throw AppError.badRequest('At least one scope is required');

  // 32 random bytes → 43-char base64url; prepend prefix; first 8 chars of
  // the secret become the public-facing prefix shown in lists.
  const secret = crypto.randomBytes(SECRET_BYTES).toString('base64url');
  const plaintext = `${KEY_PREFIX}${secret}`;
  const keyPrefix = `${KEY_PREFIX}${secret.slice(0, 8)}`;
  const keyHash = sha256Hex(plaintext);

  const row = await repo.insert({
    userId,
    name,
    keyPrefix,
    keyHash,
    scopes,
    expiresAt: input.expiresAt ?? null,
  });

  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes,
    keyPrefix: row.keyPrefix,
    plaintextKey: plaintext,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export async function listKeys(userId: string): Promise<ApiKeyView[]> {
  const rows = await repo.listByUser(userId);
  return rows.map(rowToView);
}

export async function revokeKey(userId: string, keyId: string): Promise<void> {
  const existing = await repo.findById(keyId, userId);
  if (!existing) throw AppError.notFound('API key not found');
  if (existing.revokedAt) return; // idempotent
  await repo.revoke(keyId, userId);
}

/**
 * Resolve a presented bearer token to a userId + scopes set, or throw.
 * Caller (auth middleware) should NOT log the plaintext.
 */
export async function authenticateKey(plaintext: string): Promise<{
  userId: string;
  keyId: string;
  scopes: string[];
}> {
  if (!plaintext.startsWith(KEY_PREFIX)) {
    throw AppError.unauthorized('Invalid API key');
  }
  const keyHash = sha256Hex(plaintext);
  const row = await repo.findActiveByHash(keyHash);
  if (!row) throw AppError.unauthorized('Invalid API key');
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized('API key expired');
  }
  // Fire-and-forget timestamp update — don't block the request on it
  void repo.touchLastUsed(row.id).catch(() => {});
  return { userId: row.userId, keyId: row.id, scopes: row.scopes };
}
