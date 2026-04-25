import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { businessCards } from '../../lib/db/schema.js';
import type { BusinessCard, CreateBusinessCardInput, UpdateBusinessCardInput } from '@zktalk/shared';

type Row = typeof businessCards.$inferSelect;

export function hydrate(row: Row): BusinessCard {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    displayName: row.displayName,
    company: row.company,
    jobTitle: row.jobTitle,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    notes: row.notes,
    cardImageUrl: row.cardImageUrl,
    personPhotoUrl: row.personPhotoUrl,
    linkedUserId: row.linkedUserId,
    extractedAt: row.extractedAt ? row.extractedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listByOwner(
  ownerUserId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<BusinessCard[]> {
  const filters = [eq(businessCards.ownerUserId, ownerUserId)];
  if (opts.search && opts.search.trim().length > 0) {
    const pattern = `%${opts.search.trim()}%`;
    filters.push(
      // case-insensitive partial match across the few free-text fields users
      // would actually search by — name, company, email
      or(
        ilike(businessCards.displayName, pattern),
        ilike(businessCards.company, pattern),
        ilike(businessCards.email, pattern),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(businessCards)
    .where(and(...filters))
    .orderBy(asc(sql`lower(${businessCards.displayName})`))
    .limit(Math.min(Math.max(opts.limit ?? 200, 1), 500));
  return rows.map(hydrate);
}

export async function findById(id: string): Promise<BusinessCard | null> {
  const [row] = await db.select().from(businessCards).where(eq(businessCards.id, id)).limit(1);
  return row ? hydrate(row) : null;
}

export async function create(
  ownerUserId: string,
  input: CreateBusinessCardInput,
): Promise<BusinessCard> {
  const id = uuidv7();
  const [row] = await db
    .insert(businessCards)
    .values({
      id,
      ownerUserId,
      displayName: input.displayName,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      website: input.website ?? null,
      notes: input.notes ?? null,
      cardImageUrl: input.cardImageUrl ?? null,
      personPhotoUrl: input.personPhotoUrl ?? null,
    })
    .returning();
  return hydrate(row);
}

export async function update(
  id: string,
  patch: UpdateBusinessCardInput,
): Promise<BusinessCard | null> {
  const updates: Partial<typeof businessCards.$inferInsert> = { updatedAt: new Date() };
  if (patch.displayName !== undefined) updates.displayName = patch.displayName;
  if (patch.company !== undefined) updates.company = patch.company ?? null;
  if (patch.jobTitle !== undefined) updates.jobTitle = patch.jobTitle ?? null;
  if (patch.phone !== undefined) updates.phone = patch.phone ?? null;
  if (patch.email !== undefined) updates.email = patch.email ?? null;
  if (patch.address !== undefined) updates.address = patch.address ?? null;
  if (patch.website !== undefined) updates.website = patch.website ?? null;
  if (patch.notes !== undefined) updates.notes = patch.notes ?? null;
  if (patch.cardImageUrl !== undefined) updates.cardImageUrl = patch.cardImageUrl ?? null;
  if (patch.personPhotoUrl !== undefined) updates.personPhotoUrl = patch.personPhotoUrl ?? null;

  const [row] = await db
    .update(businessCards)
    .set(updates)
    .where(eq(businessCards.id, id))
    .returning();
  return row ? hydrate(row) : null;
}

export async function remove(id: string): Promise<void> {
  await db.delete(businessCards).where(eq(businessCards.id, id));
}
