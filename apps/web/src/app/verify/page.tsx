'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@zktalk/shared';
import Link from 'next/link';

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('Missing verification token.');
      setIsVerifying(false);
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await api<{ user: User }>(
          '/api/auth/magic-link/verify',
          {
            method: 'POST',
            body: { token },
          },
        );
        if (!cancelled) {
          setUser(res.user);
          router.replace('/home');
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Verification failed. The link may have expired.');
          }
          setIsVerifying(false);
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setUser, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 text-center">
        {isVerifying ? (
          <>
            <div className="mb-4 animate-spin text-4xl">&#9881;</div>
            <h1 className="text-xl font-bold">Verifying...</h1>
            <p className="mt-2 text-sm text-gray-400">
              Please wait while we verify your magic link.
            </p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl">&#10060;</div>
            <h1 className="text-xl font-bold text-red-400">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-400">{error}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
