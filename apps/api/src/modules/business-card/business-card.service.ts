import { AppError } from '../../lib/errors.js';
import * as repo from './business-card.repository.js';
import type { CreateBusinessCardInput, UpdateBusinessCardInput } from '@zktalk/shared';

export interface ExtractedBusinessCard {
  displayName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
}

const EXTRACT_SYSTEM_PROMPT =
  'You are a business-card OCR engine. Extract the visible information from ' +
  'the photographed business card and return ONLY a single JSON object with ' +
  'these keys: displayName, company, jobTitle, phone, email, address, ' +
  'website. Use null for any field that is not present on the card. Do not ' +
  'invent values. Do not add commentary. The user may write the card in any ' +
  'language; preserve the original language for each field.';

const ANTHROPIC_VISION_MODEL = 'claude-sonnet-4-20250514';

function pickString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseJsonReply(raw: string): ExtractedBusinessCard {
  // Claude usually returns just `{ "displayName": ... }`. Strip code fences
  // and find the first `{` so a wrapper paragraph doesn't break parsing.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const startBrace = cleaned.indexOf('{');
  const endBrace = cleaned.lastIndexOf('}');
  if (startBrace === -1 || endBrace === -1 || endBrace <= startBrace) {
    throw AppError.badRequest('Auto-extract returned an unparseable response.');
  }
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned.slice(startBrace, endBrace + 1));
  } catch {
    throw AppError.badRequest('Auto-extract returned an unparseable response.');
  }
  return {
    displayName: pickString(parsed.displayName),
    company: pickString(parsed.company),
    jobTitle: pickString(parsed.jobTitle),
    phone: pickString(parsed.phone),
    email: pickString(parsed.email),
    address: pickString(parsed.address),
    website: pickString(parsed.website),
  };
}

// SSRF guard: block requests aimed at the host's own internal network.
// Private/loopback/link-local ranges + the cloud metadata IPs that AWS,
// GCP and Azure all serve from 169.254.169.254 / fd00:ec2::254.
function isPrivateOrInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost') return true;
  // IPv4 literal — split octets
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (v4) {
    const [, a, b] = v4;
    const oa = Number(a);
    const ob = Number(b);
    if (oa === 10) return true;
    if (oa === 127) return true;
    if (oa === 0) return true;
    if (oa === 169 && ob === 254) return true; // link-local + cloud metadata
    if (oa === 172 && ob >= 16 && ob <= 31) return true;
    if (oa === 192 && ob === 168) return true;
    if (oa >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6 literal — bracketed in URL.hostname comes back unbracketed here
  if (h.includes(':')) {
    if (h === '::' || h === '::1') return true;
    if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local
    if (h.startsWith('fe80')) return true; // link-local
    if (h.startsWith('::ffff:')) {
      // IPv4-mapped — recurse on the v4 part
      const v4mapped = h.slice(7);
      return isPrivateOrInternalHost(v4mapped);
    }
    return false;
  }
  // Hostname (not IP literal). The dev MinIO bucket lives at `minio` /
  // `localhost`; either name we want to block from external user input.
  if (h === 'minio' || h === '0.0.0.0') return true;
  return false;
}

async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ base64: string; mediaType: string }> {
  // Allow same-host upload URLs (where we keep our own assets) and public
  // https URLs the user might paste in. Block other schemes for safety.
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw AppError.badRequest('imageUrl must be an absolute http(s) URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw AppError.badRequest('imageUrl must use http or https.');
  }
  // Block SSRF to internal networks and cloud metadata. The image must
  // come from a public URL or the same public-asset host the upload
  // service itself serves from.
  if (isPrivateOrInternalHost(parsed.hostname)) {
    throw AppError.badRequest('imageUrl must point to a public host.');
  }
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw AppError.badRequest(
      `Failed to fetch the card image (HTTP ${res.status}). Try uploading again.`,
    );
  }
  const contentType = res.headers.get('content-type') ?? 'image/jpeg';
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  if (!mediaType.startsWith('image/')) {
    throw AppError.badRequest('imageUrl did not return an image.');
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString('base64'), mediaType };
}

/**
 * Run the card image through Claude vision (via the configured AI_API_KEY)
 * and return the structured fields it could read.
 *
 * If no Anthropic key is configured we throw a 400 with a friendly message
 * — the UI surfaces it as "auto-extract unavailable, type the fields in
 * yourself." Routing through the user's local codex/claude CLI is a
 * follow-up: those CLIs don't yet take image input in headless mode.
 */
export async function extractBusinessCardFromImage(
  imageUrl: string,
): Promise<ExtractedBusinessCard> {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    throw AppError.badRequest(
      'Auto-extract requires AI_API_KEY (Anthropic) to be configured. Type the fields in manually.',
      'AUTO_EXTRACT_DISABLED',
    );
  }

  const { base64, mediaType } = await fetchImageAsBase64(imageUrl);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_VISION_MODEL,
      max_tokens: 1024,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: 'Extract the fields from this business card.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw AppError.badRequest(
      `Auto-extract upstream failed (HTTP ${res.status}). ${errBody.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const reply = data.content?.[0]?.text;
  if (!reply) {
    throw AppError.badRequest('Auto-extract returned an empty response.');
  }
  return parseJsonReply(reply);
}

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
