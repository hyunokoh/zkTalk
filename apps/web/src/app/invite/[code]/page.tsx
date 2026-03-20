'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Link from 'next/link';

interface JoinResponse {
  community: {
    slug: string;
    name: string;
  };
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?redirect=/invite/${code}`);
    }
  }, [isLoading, user, router, code]);

  async function handleJoin() {
    setJoining(true);
    setError(null);

    try {
      const res = await api<JoinResponse>(`/api/invites/${code}/join`, {
        method: 'POST',
      });
      router.push(`/communities/${res.community.slug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to join community. The invite may be invalid or expired.');
      }
      setJoining(false);
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 text-center">
        <div className="mb-4 text-4xl">&#128233;</div>
        <h1 className="text-xl font-bold">You&apos;ve been invited!</h1>
        <p className="mt-2 text-sm text-gray-400">
          Click below to join this community.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Accept Invite'}
          </button>
          <Link
            href="/home"
            className="block text-sm text-gray-400 hover:text-gray-200"
          >
            Go home instead
          </Link>
        </div>
      </div>
    </main>
  );
}
