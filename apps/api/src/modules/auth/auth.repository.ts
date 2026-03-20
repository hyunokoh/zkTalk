import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { users } from '../../lib/db/schema.js';
import { uuidv7 } from 'uuidv7';

export interface CreateUserData {
  email: string;
  displayName: string;
  username: string;
}

export async function findUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createUser(data: CreateUserData) {
  const id = uuidv7();
  const now = new Date();
  const result = await db
    .insert(users)
    .values({
      id,
      email: data.email,
      displayName: data.displayName,
      username: data.username,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return result[0]!;
}
