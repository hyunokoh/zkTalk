import { AppError } from '../../lib/errors.js';
import * as repo from './business-card.repository.js';
import type { CreateBusinessCardInput, UpdateBusinessCardInput } from '@zktalk/shared';

async function getOwnedCard(userId: string, cardId: string) {
  const card = await repo.findById(cardId);
  if (!card || card.ownerUserId !== userId) {
    throw AppError.notFound('Business card not found', 'BUSINESS_CARD_NOT_FOUND');
  }
  return card;
}

export async function listCards(
  userId: string,
  opts: { search?: string; limit?: number } = {},
) {
  return repo.listByOwner(userId, opts);
}

export async function createCard(userId: string, input: CreateBusinessCardInput) {
  return repo.create(userId, input);
}

export async function updateCard(
  userId: string,
  cardId: string,
  patch: UpdateBusinessCardInput,
) {
  await getOwnedCard(userId, cardId);
  const updated = await repo.update(cardId, patch);
  if (!updated) {
    throw AppError.notFound('Business card not found', 'BUSINESS_CARD_NOT_FOUND');
  }
  return updated;
}

export async function deleteCard(userId: string, cardId: string) {
  await getOwnedCard(userId, cardId);
  await repo.remove(cardId);
}

export async function getCard(userId: string, cardId: string) {
  return getOwnedCard(userId, cardId);
}
