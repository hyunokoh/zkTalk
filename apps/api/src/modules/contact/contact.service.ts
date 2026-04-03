import crypto from 'node:crypto';
import * as repo from './contact.repository.js';
import { findAuthMethodsByUserId } from '../auth/auth.repository.js';

/**
 * Compute SHA-256 hash of a string (hex-encoded).
 */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

interface ContactMatch {
  phoneHash: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

/**
 * Sync contact hashes: stores them and returns matching zkTalk users.
 *
 * The client sends SHA-256 hashes of normalized E.164 phone numbers.
 * The server:
 * 1. Stores the hashes in contactHashes table
 * 2. Computes SHA-256 of all phone-type auth methods
 * 3. Intersects the two sets to find matches
 * 4. Returns matched user info
 */
export async function syncContacts(
  userId: string,
  hashes: string[],
): Promise<{ matches: ContactMatch[] }> {
  // Replace all existing contact hashes for this user
  await repo.deleteContactHashesByUserId(userId);
  await repo.insertContactHashes(userId, hashes);

  // Get all phone auth methods from the database
  const phoneAuthMethods = await repo.findUsersByPhoneHashes(hashes);

  // Compute SHA-256 of each phone number and check against submitted hashes
  const hashSet = new Set(hashes);
  const matches: ContactMatch[] = [];
  const seenUserIds = new Set<string>();

  for (const method of phoneAuthMethods) {
    // Skip the requesting user's own phone number
    if (method.userId === userId) continue;

    const phoneHash = sha256(method.identifier);
    if (hashSet.has(phoneHash) && !seenUserIds.has(method.userId)) {
      seenUserIds.add(method.userId);
      const userInfo = await repo.findUserBasicInfo(method.userId);
      if (userInfo) {
        matches.push({
          phoneHash,
          userId: userInfo.id,
          displayName: userInfo.displayName,
          username: userInfo.username,
          avatarUrl: userInfo.avatarUrl,
        });
      }
    }
  }

  return { matches };
}

/**
 * Get contact-based friend suggestions.
 * Returns users who have the requesting user's phone hash in their contacts (mutual discovery).
 */
export async function getContactSuggestions(userId: string): Promise<ContactMatch[]> {
  // Get the requesting user's phone number(s)
  const authMethods = await findAuthMethodsByUserId(userId);
  const phoneMethod = authMethods.find((m) => m.type === 'phone');

  if (!phoneMethod) {
    return [];
  }

  // Compute the hash of the user's phone number
  const myPhoneHash = sha256(phoneMethod.identifier);

  // Find users who have uploaded a contact hash matching our phone
  const usersWhoHaveMyPhone = await repo.findUsersWhoHaveMyPhoneHash(myPhoneHash, userId);

  // Get the requesting user's contact hashes to check for mutual discovery
  const myContactHashes = await repo.getContactHashesByUserId(userId);
  const myHashSet = new Set(myContactHashes.map((h) => h.phoneHash));

  // For mutual discovery, also check if we have their phone hash
  const suggestions: ContactMatch[] = [];
  for (const user of usersWhoHaveMyPhone) {
    // Get their phone to check if we also have their hash
    const theirAuthMethods = await findAuthMethodsByUserId(user.userId);
    const theirPhone = theirAuthMethods.find((m) => m.type === 'phone');

    if (theirPhone) {
      const theirPhoneHash = sha256(theirPhone.identifier);
      const isMutual = myHashSet.has(theirPhoneHash);

      suggestions.push({
        phoneHash: theirPhoneHash,
        userId: user.userId,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        ...(isMutual ? {} : {}), // could add isMutual flag if needed
      });
    }
  }

  return suggestions;
}
