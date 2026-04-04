'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';

interface OnboardingData {
  id: string;
  communityId: string;
  welcomeMessage: string | null;
  rules: string | null;
  defaultChannelIds: string | null;
  isEnabled: boolean;
}

interface JoinResponse {
  membership: {
    communityId: string;
  };
  community: {
    slug: string;
  };
  onboarding: OnboardingData | null;
  alreadyMember?: boolean;
}

function setPendingOnboarding(communityId: string, onboarding: OnboardingData | null) {
  if (typeof window === 'undefined' || !onboarding) return;
  window.sessionStorage.setItem(`pending_onboarding_${communityId}`, JSON.stringify(onboarding));
}

export default function InvitePage() {
  const { t } = useTranslation();
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
      const result = await api<JoinResponse>(`/api/invites/${code}/join`, {
        method: 'POST',
      });
      setPendingOnboarding(result.membership.communityId, result.onboarding);
      router.push(`/communities/${result.community.slug}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(t('invite.alreadyMember'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('invite.error'));
      }
      setJoining(false);
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-gray-400">{t('common.loading')}</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 text-center">
        <div className="mb-4 text-4xl">&#128233;</div>
        <h1 className="text-xl font-bold">{t('invite.title')}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {t('invite.description')}
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
            {joining ? t('invite.joining') : t('invite.accept')}
          </button>
          <Link
            href="/home"
            className="block text-sm text-gray-400 hover:text-gray-200"
          >
            {t('invite.goHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
