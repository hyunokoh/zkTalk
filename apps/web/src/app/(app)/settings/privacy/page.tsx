'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  isSealedSenderEnabled,
  setSealedSenderEnabled,
} from '@/lib/sealed-sender';

export default function PrivacySettingsPage() {
  const { t } = useTranslation();
  const [sealedEnabled, setSealedEnabled] = useState(false);

  useEffect(() => {
    setSealedEnabled(isSealedSenderEnabled());
  }, []);

  const handleToggle = () => {
    const next = !sealedEnabled;
    setSealedEnabled(next);
    setSealedSenderEnabled(next);
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">
        {t('privacy.metadata')}
      </h1>

      <div className="space-y-6">
        {/* Sealed Sender Toggle */}
        <div className="rounded-lg border border-line bg-bg-subtle p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t('privacy.sealedSender')}
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                {t('privacy.sealedDesc')}
              </p>
            </div>

            <button
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-gray-900 ${
                sealedEnabled ? 'bg-accent' : 'bg-bg-subtle'
              }`}
              role="switch"
              aria-checked={sealedEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                  sealedEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {sealedEnabled && (
            <div className="mt-4 rounded-md border border-success bg-success/20 p-3">
              <div className="flex items-center gap-2 text-sm text-success">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t('privacy.sealedSender')} {t('privacy.enabled')}
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="rounded-lg border border-line bg-bg-subtle/50 p-5">
          <h3 className="text-sm font-medium text-fg-muted">
            {t('privacy.howItWorks')}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-accent">1.</span>
              {t('privacy.step1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-accent">2.</span>
              {t('privacy.step2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-accent">3.</span>
              {t('privacy.step3')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
