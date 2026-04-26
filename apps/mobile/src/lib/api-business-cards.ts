import { api } from './api';

export interface BusinessCard {
  id: string;
  ownerUserId: string;
  displayName: string;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  cardImageUrl: string | null;
  personPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBusinessCardInput {
  displayName: string;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
  cardImageUrl?: string | null;
  personPhotoUrl?: string | null;
}

export interface ExtractedBusinessCardFields {
  displayName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
}

export async function fetchBusinessCards(opts: { search?: string } = {}): Promise<BusinessCard[]> {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  const qs = params.toString();
  const res = await api<{ cards: BusinessCard[] }>(
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

export async function deleteBusinessCard(cardId: string): Promise<void> {
  await api(`/api/business-cards/${cardId}`, { method: 'DELETE' });
}

export async function extractBusinessCard(imageUrl: string): Promise<ExtractedBusinessCardFields> {
  const res = await api<{ fields: ExtractedBusinessCardFields }>(
    '/api/business-cards/extract',
    { method: 'POST', body: { imageUrl } },
  );
  return res.fields;
}
