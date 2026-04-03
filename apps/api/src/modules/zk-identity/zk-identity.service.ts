import { uuidv7 } from 'uuidv7';
import * as repo from './zk-identity.repository.js';

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Store a ZK credential hash for the current user.
 * The actual credential data stays client-side; the server only stores the hash
 * and optional metadata (e.g., credential type label).
 */
export async function addCredential(
  userId: string,
  data: {
    credentialType: string;
    credentialHash: string;
    metadata?: string;
  },
) {
  const credential = await repo.createCredential({
    id: uuidv7(),
    userId,
    credentialType: data.credentialType,
    credentialHash: data.credentialHash,
    metadata: data.metadata ?? null,
  });

  return credential;
}

/**
 * Get public credential badges for a user.
 * Returns only non-sensitive info (type, verified status, metadata).
 */
export async function getUserCredentials(userId: string) {
  const credentials = await repo.findCredentialsByUserId(userId);

  // Return public badge info only — hide the credential hash from public queries
  return credentials.map((c) => ({
    id: c.id,
    credentialType: c.credentialType,
    isVerified: c.isVerified,
    metadata: c.metadata,
    createdAt: c.createdAt,
  }));
}
