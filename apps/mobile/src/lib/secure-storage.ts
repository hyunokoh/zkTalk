import * as SecureStore from 'expo-secure-store';

// ---------------------------------------------------------------------------
// Secure key storage using expo-secure-store (iOS Keychain / Android Keystore)
// Used for E2EE private keys and other sensitive data
// ---------------------------------------------------------------------------

const KEY_PREFIX = 'zktalk_';

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${KEY_PREFIX}${key}`);
  } catch (error) {
    console.error('[SecureStore] Failed to get item:', key, error);
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(`${KEY_PREFIX}${key}`, value);
  } catch (error) {
    console.error('[SecureStore] Failed to set item:', key, error);
    throw error;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`${KEY_PREFIX}${key}`);
  } catch (error) {
    console.error('[SecureStore] Failed to delete item:', key, error);
  }
}

// ---------------------------------------------------------------------------
// E2EE key management helpers
// ---------------------------------------------------------------------------

const PRIVATE_KEY_KEY = 'e2ee_private_key';
const PUBLIC_KEY_KEY = 'e2ee_public_key';

export async function getE2eeKeyPair(): Promise<{ privateKey: string; publicKey: string } | null> {
  const privateKey = await getSecureItem(PRIVATE_KEY_KEY);
  const publicKey = await getSecureItem(PUBLIC_KEY_KEY);
  if (!privateKey || !publicKey) return null;
  return { privateKey, publicKey };
}

export async function storeE2eeKeyPair(privateKey: string, publicKey: string): Promise<void> {
  await setSecureItem(PRIVATE_KEY_KEY, privateKey);
  await setSecureItem(PUBLIC_KEY_KEY, publicKey);
}

export async function clearE2eeKeyPair(): Promise<void> {
  await deleteSecureItem(PRIVATE_KEY_KEY);
  await deleteSecureItem(PUBLIC_KEY_KEY);
}
