'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSessionToken } from '@/lib/session-token';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const token = searchParams.get('token');
  const nextPath = (() => {
    const raw = searchParams.get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/home';
    }
    return raw;
  })();
  const missingTokenMessage = t('auth.missingToken');
  const verifyExpiredMessage = t('auth.verifyExpired');

  useEffect(() => {
    if (!token) {
      setError(missingTokenMessage);
      setIsVerifying(false);
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await api<{ success: true; sessionToken: string }>(
          '/api/auth/magic-link/verify',
          {
            method: 'POST',
            body: { token },
          },
        );
        if (!cancelled) {
          setSessionToken(res.sessionToken);
          await fetchUser();
          router.replace(nextPath);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError(verifyExpiredMessage);
          }
          setIsVerifying(false);
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [fetchUser, missingTokenMessage, nextPath, router, token, verifyExpiredMessage]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 text-center">
        {isVerifying ? (
          <>
            <div className="mb-4 animate-spin text-4xl">&#9881;</div>
            <h1 className="text-xl font-bold">{t('auth.verifying')}</h1>
            <p className="mt-2 text-sm text-gray-400">
              {t('auth.verifyWait')}
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">&#10060;</div>
            <h1 className="text-xl font-bold text-red-400">{t('auth.verifyFailed')}</h1>
            <p className="mt-2 text-sm text-gray-400">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              {t('auth.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
