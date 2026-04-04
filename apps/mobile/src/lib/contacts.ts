import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { api } from './api';
import { t } from './i18n';

interface ContactSyncResult {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

/**
 * Normalizes a phone number by removing everything except digits and leading +.
 */
function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Ensure it starts with + for international format
  if (!cleaned.startsWith('+')) {
    // Assume Korean number if no country code
    if (cleaned.startsWith('0')) {
      return `+82${cleaned.slice(1)}`;
    }
    return `+${cleaned}`;
  }
  return cleaned;
}

/**
 * Hashes a phone number using SHA-256 for privacy-preserving contact matching.
 */
async function hashPhoneNumber(phone: string): Promise<string> {
  const normalized = normalizePhoneNumber(phone);
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
  );
}

/**
 * Reads phone contacts, hashes their phone numbers, and sends them
 * to the server for matching against registered users.
 *
 * Returns an array of matched users that the current user can add as friends.
 */
export async function syncContacts(): Promise<ContactSyncResult[]> {
  // Request permission
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(t('friends.contactPermissionRequired'));
  }

  // Read contacts with phone numbers
  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  if (!data || data.length === 0) {
    return [];
  }

  // Collect all unique phone numbers
  const phoneNumbers: string[] = [];
  for (const contact of data) {
    if (contact.phoneNumbers) {
      for (const phone of contact.phoneNumbers) {
        if (phone.number) {
          phoneNumbers.push(phone.number);
        }
      }
    }
  }

  if (phoneNumbers.length === 0) {
    return [];
  }

  // Deduplicate after normalization
  const normalizedSet = new Set<string>();
  const uniquePhones: string[] = [];
  for (const phone of phoneNumbers) {
    const normalized = normalizePhoneNumber(phone);
    if (!normalizedSet.has(normalized)) {
      normalizedSet.add(normalized);
      uniquePhones.push(phone);
    }
  }

  // Hash all phone numbers
  const hashes = await Promise.all(uniquePhones.map(hashPhoneNumber));

  // Send to server for matching
  const result = await api<{ matches: ContactSyncResult[] }>(
    '/api/contacts/sync',
    {
      method: 'POST',
      body: { hashes },
    },
  );

  return result.matches;
}
