/**
 * Safety-number / fingerprint computation for DM E2EE.
 *
 * Both peers see the SAME number when the keys haven't been tampered
 * with. If the server (or anyone) silently swaps a public key, the
 * numbers diverge and either side reading the fingerprint aloud catches
 * it — same idea as Signal's safety numbers and WhatsApp's security
 * code.
 *
 * Algorithm (intentionally simple — no external libraries):
 *   1. Sort the two base64 public keys lexicographically so each side
 *      derives the same canonical input regardless of who is "self".
 *   2. SHA-256(keyA || ":" || keyB).
 *   3. Take the first 16 bytes → 32 hex chars.
 *   4. Format as 8 groups of 4 hex digits separated by spaces, easy to
 *      read aloud over a voice call.
 */
export async function computeSafetyNumber(
  publicKeyA: string,
  publicKeyB: string,
): Promise<string> {
  const [first, second] = [publicKeyA, publicKeyB].sort();
  const input = new TextEncoder().encode(`${first}:${second}`);
  const digest = await crypto.subtle.digest('SHA-256', input);
  const bytes = new Uint8Array(digest).slice(0, 16);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  // 32 chars → 8 groups of 4
  const groups: string[] = [];
  for (let i = 0; i < hex.length; i += 4) {
    groups.push(hex.slice(i, i + 4));
  }
  return groups.join(' ').toUpperCase();
}

/**
 * Quick fingerprint of a single public key — used for the
 * "your key" / "their key" labels separately from the joint
 * safety number.
 */
export async function computeKeyFingerprint(publicKey: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(publicKey));
  const bytes = new Uint8Array(digest).slice(0, 8);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  // 16 chars → 4 groups of 4
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)} ${hex.slice(8, 12)} ${hex.slice(12, 16)}`.toUpperCase();
}
