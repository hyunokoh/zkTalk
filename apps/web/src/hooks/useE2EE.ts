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
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const privateKeyRef = useRef<string | null>(null);

  const refreshSharedSecret = useCallback(async (): Promise<CryptoKey> => {
    if (!currentUserId || !otherUserId) {
      throw new Error('E2EE not ready');
    }

    let privateKeyBase64 = privateKeyRef.current ?? await getPrivateKey(currentUserId);
    if (!privateKeyBase64) {
      const keyPair = await generateKeyPair();
      privateKeyBase64 = keyPair.privateKey;
      privateKeyRef.current = privateKeyBase64;
      await storePrivateKey(currentUserId, privateKeyBase64);
      await api('/api/me/keys', {
        method: 'PUT',
        body: { publicKey: keyPair.publicKey },
      });
    }

    const { publicKey: otherPublicKey } = await api<{ publicKey: string | null }>(
      `/api/users/${otherUserId}/keys`,
    );
    if (!otherPublicKey) {
      throw new Error('Peer E2EE key is not available');
    }

    const sharedSecret = await deriveSharedSecret(privateKeyBase64, otherPublicKey);
    sharedSecretRef.current = sharedSecret;
    return sharedSecret;
  }, [currentUserId, otherUserId]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
        privateKeyRef.current = privateKeyBase64;

        // 2. Fetch the other user's public key
        const { publicKey: otherPublicKey } = await api<{ publicKey: string | null }>(
          `/api/users/${otherUserId}/keys`,
        );

        if (!otherPublicKey) {
          // Other user hasn't set up E2EE yet
          if (!cancelled) {
            setIsReady(false);
            setIsLoading(false);
            retryTimerRef.current = setTimeout(() => {
              retryTimerRef.current = null;
              if (!cancelled) {
                void initialize();
              }
            }, 1_500);
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
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [currentUserId, otherUserId]);

  const encrypt = useCallback(async (plaintext: string): Promise<string> => {
    const sharedSecret = await refreshSharedSecret();
    return cryptoEncrypt(plaintext, sharedSecret);
  }, [refreshSharedSecret]);

  const decrypt = useCallback(async (ciphertext: string): Promise<string> => {
    try {
      const sharedSecret = await refreshSharedSecret();
      return await cryptoDecrypt(ciphertext, sharedSecret);
    } catch (error) {
      if (sharedSecretRef.current) {
        return cryptoDecrypt(ciphertext, sharedSecretRef.current);
      }
      throw error;
    }
  }, [refreshSharedSecret]);

  return {
    isReady,
    isLoading,
    encrypt,
    decrypt,
    error,
  };
}
