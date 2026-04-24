'use client';

import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setSessionToken } from '@/lib/session-token';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/lib/i18n';

type AuthTab = 'phone' | 'email';

// ── Country Codes ────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: '+82', country: 'KR', label: '🇰🇷 +82' },
  { code: '+1', country: 'US', label: '🇺🇸 +1' },
  { code: '+81', country: 'JP', label: '🇯🇵 +81' },
  { code: '+86', country: 'CN', label: '🇨🇳 +86' },
  { code: '+44', country: 'GB', label: '🇬🇧 +44' },
  { code: '+49', country: 'DE', label: '🇩🇪 +49' },
  { code: '+33', country: 'FR', label: '🇫🇷 +33' },
];

// ── OTP Input Component ──────────────────────────────────────────────

function OtpInput({
  length,
  value,
  onChange,
  disabled,
  testIdPrefix,
}: {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const digits = value.split('');
    digits[idx] = char;
    const newVal = digits.join('').slice(0, length);
    onChange(newVal);
    if (char && idx < length - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          data-testid={testIdPrefix ? `${testIdPrefix}-digit-${i}` : undefined}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => handleInput(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="h-12 w-10 rounded-md border border-line bg-bg-subtle text-center text-lg font-bold text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
      ))}
    </div>
  );
}

// ── Timer Hook ───────────────────────────────────────────────────────

function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    if (remaining <= 0) {
      setIsRunning(false);
      return;
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, isRunning]);

  const start = useCallback((secs?: number) => {
    setRemaining(secs ?? seconds);
    setIsRunning(true);
  }, [seconds]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return { remaining, isRunning, isExpired: !isRunning && remaining <= 0, start, formatTime };
}

// ── Main Login Page ──────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-fg-muted">...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<AuthTab>('phone');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone state
  const [countryCode, setCountryCode] = useState('+82');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const timer = useCountdown(300); // 5 minutes

  // Email state
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  // QR state
  const [showQr, setShowQr] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextPath = (() => {
    const raw = searchParams.get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/home';
    }
    return raw;
  })();

  useEffect(() => {
    if (user) {
      router.replace(nextPath);
    }
  }, [nextPath, router, user]);

  // Cleanup QR polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, []);

  // ── Phone Handlers ─────────────────────────────────────────────

  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/[^0-9]/g, '')}`;

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api<{ sent: boolean; code?: string }>(
        '/api/auth/phone/request',
        { method: 'POST', body: { phoneNumber: fullPhoneNumber } },
      );
      setOtpSent(true);
      timer.start(300);
      if (res.code) {
        setDevOtpCode(res.code);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api<{ success: true; sessionToken: string }>('/api/auth/phone/verify', {
        method: 'POST',
        body: { phoneNumber: fullPhoneNumber, code: otpCode },
      });
      setSessionToken(res.sessionToken);
      await fetchUser();
      router.replace(nextPath);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.invalidCode'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && otpSent && !isSubmitting) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  // ── Email Handlers ─────────────────────────────────────────────

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api<{ message: string; token?: string }>(
        '/api/auth/magic-link/request',
        { method: 'POST', body: { email } },
      );
      setEmailSubmitted(true);
      if (res.token) {
        setDevToken(res.token);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.genericError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── OAuth Handlers ─────────────────────────────────────────────

  async function handleGoogleLogin() {
    // For MVP: Google Sign-In would open a popup and return an idToken
    // This is a placeholder that shows the flow
    setError('Google Sign-In requires client configuration. Set GOOGLE_CLIENT_ID in .env');
  }

  async function handleAppleLogin() {
    setError('Apple Sign-In requires client configuration. Set APPLE_CLIENT_ID in .env');
  }

  // ── QR Code Handlers ──────────────────────────────────────────

  async function handleShowQr() {
    setShowQr(true);
    setError(null);

    try {
      const res = await api<{ qrToken: string; expiresAt: string }>(
        '/api/auth/qr/generate',
        { method: 'POST' },
      );
      setQrToken(res.qrToken);

      // Start polling
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      qrPollRef.current = setInterval(async () => {
        try {
          const status = await api<{ status: string; sessionToken?: string }>(
            `/api/auth/qr/status/${res.qrToken}`,
          );
          if (status.status === 'confirmed' && status.sessionToken) {
            if (qrPollRef.current) clearInterval(qrPollRef.current);
            setSessionToken(status.sessionToken);
            await fetchUser();
            router.replace(nextPath);
          }
        } catch {
          // Token expired or error, stop polling
          if (qrPollRef.current) clearInterval(qrPollRef.current);
          setShowQr(false);
          setQrToken(null);
        }
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('auth.genericError'));
      }
      setShowQr(false);
    }
  }

  // ── Masked phone for display ───────────────────────────────────

  const maskedPhone = phoneNumber
    ? `${phoneNumber.slice(0, -4).replace(/./g, '*')}${phoneNumber.slice(-4)}`
    : '';

  // ── Phone OTP Verification View ────────────────────────────────

  if (otpSent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-bg-subtle p-8">
          <h1 className="mb-2 text-center text-xl font-bold">{t('auth.enterCode')}</h1>
          <p className="mb-6 text-center text-sm text-fg-muted">
            {t('auth.codeSentTo', { phone: maskedPhone || fullPhoneNumber })}
          </p>

          <OtpInput
            length={6}
            value={otpCode}
            onChange={setOtpCode}
            disabled={isSubmitting}
            testIdPrefix="login-otp"
          />

          {devOtpCode && (
            <div data-testid="login-otp-dev-code" className="mt-4 rounded bg-bg-subtle p-3 text-center">
              <p className="mb-1 text-xs text-fg-muted">Dev code:</p>
              <p className="text-lg font-bold text-accent">{devOtpCode}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className={`${timer.isExpired ? 'text-danger' : 'text-fg-muted'}`}>
              {timer.isExpired
                ? t('auth.codeExpired')
                : t('auth.timeRemaining', { time: timer.formatTime(timer.remaining) })}
            </span>
            <button
              onClick={(e) => {
                setOtpCode('');
                setDevOtpCode(null);
                handleRequestOtp(e as unknown as FormEvent);
              }}
              disabled={isSubmitting || timer.isRunning}
              className="text-accent hover:text-accent disabled:opacity-50"
            >
              {t('auth.resend')}
            </button>
          </div>

          {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}

          <button
            onClick={() => {
              setOtpSent(false);
              setOtpCode('');
              setDevOtpCode(null);
              setError(null);
            }}
            className="mt-6 block w-full text-center text-sm text-fg-muted hover:text-fg-muted"
          >
            {t('common.back')}
          </button>
        </div>
      </main>
    );
  }

  // ── Email Submitted View ───────────────────────────────────────

  if (emailSubmitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-bg-subtle p-8 text-center">
          <div className="mb-4 text-4xl">&#9993;</div>
          <h1 className="text-xl font-bold">{t('auth.checkEmail')}</h1>
          <p className="mt-2 text-sm text-fg-muted">
            {t('auth.magicLinkSent')}{' '}
            <span className="font-medium text-fg-muted">{email}</span>
          </p>
          {devToken && (
            <div data-testid="login-email-dev-link" className="mt-4 rounded bg-bg-subtle p-3">
              <p className="mb-1 text-xs text-fg-muted">{t('auth.devToken')}</p>
              <a
                href={`/verify?token=${devToken}`}
                className="break-all text-sm text-accent underline"
              >
                /verify?token={devToken}
              </a>
            </div>
          )}
          <button
            onClick={() => {
              setEmailSubmitted(false);
              setDevToken(null);
            }}
            className="mt-6 text-sm text-fg-muted hover:text-fg-muted"
          >
            {t('auth.useDifferentEmail')}
          </button>
        </div>
      </main>
    );
  }

  // ── QR Code View ───────────────────────────────────────────────

  if (showQr) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-lg bg-bg-subtle p-8 text-center">
          <h1 className="mb-4 text-xl font-bold">{t('auth.qrLogin')}</h1>

          {qrToken ? (
            <>
              <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-lg bg-white p-4">
                {/* QR code representation - in production use a QR library */}
                <div className="text-center">
                  <div className="mb-2 text-4xl text-fg">&#9635;</div>
                  <p className="break-all text-xs text-fg">
                    zktalk://qr/{qrToken.substring(0, 8)}...
                  </p>
                </div>
              </div>
              <p className="text-sm text-fg-muted">{t('auth.scanQr')}</p>
              <div className="mt-2 animate-pulse text-xs text-fg-muted">
                {t('auth.scanQr')}
              </div>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-fg-muted">{t('common.loading')}</p>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <button
            onClick={() => {
              if (qrPollRef.current) clearInterval(qrPollRef.current);
              setShowQr(false);
              setQrToken(null);
              setError(null);
            }}
            className="mt-6 text-sm text-fg-muted hover:text-fg-muted"
          >
            {t('common.back')}
          </button>
        </div>
      </main>
    );
  }

  // ── Main Login View ────────────────────────────────────────────

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-bg-subtle p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">{t('auth.welcome')}</h1>

        {/* Tab Selector */}
        <div className="mb-6 flex rounded-md border border-line">
          <button
            data-testid="login-tab-phone"
            onClick={() => { setActiveTab('phone'); setError(null); }}
            className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'phone'
                ? 'bg-accent text-white'
                : 'bg-bg-subtle text-fg-muted hover:text-fg-muted'
            }`}
          >
            {t('auth.phoneTab')}
          </button>
          <button
            data-testid="login-tab-email"
            onClick={() => { setActiveTab('email'); setError(null); }}
            className={`flex-1 rounded-r-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'bg-accent text-white'
                : 'bg-bg-subtle text-fg-muted hover:text-fg-muted'
            }`}
          >
            {t('auth.emailTab')}
          </button>
        </div>

        {/* Phone Tab */}
        {activeTab === 'phone' && (
          <form data-testid="login-phone-form" onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-fg-muted">
                {t('auth.phone')}
              </label>
              <div className="flex gap-2">
                <select
                  data-testid="login-phone-country"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 rounded-md border border-line bg-bg-subtle px-2 py-2 text-sm text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {COUNTRY_CODES.map((cc) => (
                    <option key={cc.code} value={cc.code}>{cc.label}</option>
                  ))}
                </select>
                <input
                  id="phone"
                  data-testid="login-phone-input"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t('auth.phonePlaceholder')}
                  className="flex-1 rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              data-testid="login-phone-submit"
              type="submit"
              disabled={isSubmitting || !phoneNumber.trim()}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isSubmitting ? t('auth.sending') : t('auth.sendCode')}
            </button>
          </form>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <form data-testid="login-email-form" onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-fg-muted">
                {t('auth.email')}
              </label>
              <input
                id="email"
                data-testid="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              data-testid="login-email-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-50"
            >
              {isSubmitting ? t('auth.sending') : t('auth.continueWithEmail')}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-bg-subtle" />
          <span className="text-xs text-fg-muted">{t('auth.orContinueWith')}</span>
          <div className="h-px flex-1 bg-bg-subtle" />
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-bg-subtle px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.google')}
          </button>

          <button
            onClick={handleAppleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-line bg-bg-subtle px-4 py-2.5 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-subtle"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t('auth.apple')}
          </button>
        </div>

        {/* QR Code Section */}
        <div className="mt-6 border-t border-line pt-4 text-center">
          <button
            onClick={handleShowQr}
            className="inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="3" height="3" />
              <rect x="18" y="14" width="3" height="3" />
              <rect x="14" y="18" width="3" height="3" />
              <rect x="18" y="18" width="3" height="3" />
            </svg>
            {t('auth.qrLogin')}
          </button>
        </div>
      </div>
    </main>
  );
}
