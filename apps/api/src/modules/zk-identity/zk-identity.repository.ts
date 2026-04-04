import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { zkCredentials } from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// ZK Credential CRUD
// ---------------------------------------------------------------------------

export async function createCredential(data: {
  id: string;
  userId: string;
  credentialType: string;
  credentialHash: string;
  metadata: string | null;
}) {
  const [credential] = await db
    .insert(zkCredentials)
    .values({
      id: data.id,
      userId: data.userId,
      credentialType: data.credentialType,
      credentialHash: data.credentialHash,
      metadata: data.metadata,
      isVerified: false,
    })
    .returning();
  return credential;
}

export async function findCredentialsByUserId(userId: string) {
  return db
    .select({
      id: zkCredentials.id,
      credentialType: zkCredentials.credentialType,
      credentialHash: zkCredentials.credentialHash,
      metadata: zkCredentials.metadata,
      isVerified: zkCredentials.isVerified,
      createdAt: zkCredentials.createdAt,
    })
    .from(zkCredentials)
    .where(eq(zkCredentials.userId, userId));
}

export async function findCredentialById(id: string) {
  const [credential] = await db
    .select()
    .from(zkCredentials)
    .where(eq(zkCredentials.id, id))
    .limit(1);
  return credential ?? null;
}
