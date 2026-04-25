import { api } from '@/lib/api';
import type {
  BusinessCard,
  CreateBusinessCardInput,
  UpdateBusinessCardInput,
} from '@zktalk/shared';

export interface ListBusinessCardsResponse {
  cards: BusinessCard[];
}

export async function fetchBusinessCards(opts: { search?: string } = {}): Promise<BusinessCard[]> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  const qs = params.toString();
  const res = await api<ListBusinessCardsResponse>(
    `/api/business-cards${qs ? `?${qs}` : ''}`,
  );
  return res.cards;
}

export async function createBusinessCard(input: CreateBusinessCardInput): Promise<BusinessCard> {
  const res = await api<{ card: BusinessCard }>('/api/business-cards', {
    method: 'POST',
    body: input,
  });
  return res.card;
}

export async function updateBusinessCard(
  cardId: string,
  patch: UpdateBusinessCardInput,
): Promise<BusinessCard> {
  const res = await api<{ card: BusinessCard }>(`/api/business-cards/${cardId}`, {
    method: 'PATCH',
    body: patch,
  });
  return res.card;
}

export async function deleteBusinessCard(cardId: string): Promise<void> {
  await api(`/api/business-cards/${cardId}`, { method: 'DELETE' });
}
