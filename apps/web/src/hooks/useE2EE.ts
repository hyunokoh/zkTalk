'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import {
  generateKeyPair,
  storePrivateKey,
  getPrivateKey,
  deriveSharedSecret,
  encrypt as cryptoEncrypt,
  decrypt as cryptoDecrypt,
} from '@/lib/crypto';

interface UseE2EEOptions {
  /** The other user's ID in a 1:1 DM conversation */
  otherUserId: string | null;
}

interface UseE2EEReturn {
  /** Whether the E2EE system is ready for encrypt/decrypt */
  isReady: boolean;
  /** Whether keys are currently being generated/loaded */
  isLoading: boolean;
  /** Encrypt plaintext to base64 ciphertext */
  encrypt: (plaintext: string) => Promise<string>;
  /** Decrypt base64 ciphertext to plaintext */
  decrypt: (ciphertext: string) => Promise<string>;
  /** Error message if key setup failed */
  error: string | null;
}

export function useE2EE({ otherUserId }: UseE2EEOptions): UseE2EEReturn {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sharedSecretRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      sharedSecretRef.current = null;
      setIsReady(false);
      setIsLoading(false);
      return;
    }

    const activeUserId = currentUserId;
    let cancelled = false;

    async function initialize() {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Check if we have a private key in IndexedDB
        let privateKeyBase64 = await getPrivateKey(activeUserId);

        if (!privateKeyBase64) {
          // Generate new key pair
          const keyPair = await generateKeyPair();
          privateKeyBase64 = keyPair.privateKey;

          // Store private key in IndexedDB
          await storePrivateKey(activeUserId, privateKeyBase64);

          // Upload public key to server
          await api('/api/me/keys', {
            method: 'PUT',
            body: { publicKey: keyPair.publicKey },
          });
        }

        // 2. Fetch the other user's public key
        const { publicKey: otherPublicKey } = await api<{ publicKey: string | null }>(
          `/api/users/${otherUserId}/keys`,
        );

        if (!otherPublicKey) {
          // Other user hasn't set up E2EE yet
          if (!cancelled) {
            setIsReady(false);
            setIsLoading(false);
          }
          return;
        }

        // 3. Derive shared secret
        const sharedSecret = await deriveSharedSecret(privateKeyBase64, otherPublicKey);
        sharedSecretRef.current = sharedSecret;

        if (!cancelled) {
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize E2EE');
          setIsReady(false);
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, otherUserId]);

  const encrypt = useCallback(async (plaintext: string): Promise<string> => {
    if (!sharedSecretRef.current) {
      throw new Error('E2EE not ready');
    }
    return cryptoEncrypt(plaintext, sharedSecretRef.current);
  }, []);

  const decrypt = useCallback(async (ciphertext: string): Promise<string> => {
    if (!sharedSecretRef.current) {
      throw new Error('E2EE not ready');
    }
    return cryptoDecrypt(ciphertext, sharedSecretRef.current);
  }, []);

  return {
    isReady,
    isLoading,
    encrypt,
    decrypt,
    error,
  };
}
