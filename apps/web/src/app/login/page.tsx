'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/home');
    }
  }, [user, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api<{ message: string; token?: string }>(
        '/api/auth/magic-link/request',
        {
          method: 'POST',
          body: { email },
        },
      );
      setSubmitted(true);
      if (res.token) {
        setDevToken(res.token);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8 text-center">
          <div className="mb-4 text-4xl">&#9993;</div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-gray-400">
            We sent a magic link to{' '}
            <span className="font-medium text-gray-200">{email}</span>
          </p>
          {devToken && (
            <div className="mt-4 rounded bg-gray-700 p-3">
              <p className="mb-1 text-xs text-gray-400">Dev token:</p>
              <a
                href={`/verify?token=${devToken}`}
                className="break-all text-sm text-indigo-400 underline"
              >
                /verify?token={devToken}
              </a>
            </div>
          )}
          <button
            onClick={() => {
              setSubmitted(false);
              setDevToken(null);
            }}
            className="mt-6 text-sm text-gray-400 hover:text-gray-200"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-gray-800 p-8">
        <h1 className="mb-2 text-center text-2xl font-bold">Welcome to zkTalk</h1>
        <p className="mb-6 text-center text-sm text-gray-400">
          Enter your email to sign in or create an account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Continue with Email'}
          </button>
        </form>
      </div>
    </main>
  );
}
