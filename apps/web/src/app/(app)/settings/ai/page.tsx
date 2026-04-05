'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEYS = {
  assistantEnabled: 'zktalk_ai_assistant_enabled',
  composerActionsEnabled: 'zktalk_ai_composer_actions_enabled',
  channelSummaryEnabled: 'zktalk_ai_channel_summary_enabled',
};

function useStoredBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') setValue(true);
    if (raw === 'false') setValue(false);
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, String(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-gray-400">{description}</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            enabled ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const [assistantEnabled, setAssistantEnabled] = useStoredBoolean(STORAGE_KEYS.assistantEnabled, true);
  const [composerActionsEnabled, setComposerActionsEnabled] = useStoredBoolean(STORAGE_KEYS.composerActionsEnabled, true);
  const [channelSummaryEnabled, setChannelSummaryEnabled] = useStoredBoolean(STORAGE_KEYS.channelSummaryEnabled, true);

  const providerLabel = useMemo(() => 'Qwen via OpenRouter', []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300/80">AI</p>
          <h1 className="mt-2 text-3xl font-bold text-white">AI settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Manage the desktop AI assistant, composer actions, and channel summaries.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-full border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-gray-600 hover:bg-gray-750"
        >
          Back to settings
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="space-y-4">
          <ToggleCard
            title="AI assistant"
            description="Show the global AI assistant panel from the community rail sparkle button."
            enabled={assistantEnabled}
            onToggle={() => setAssistantEnabled((prev) => !prev)}
          />

          <ToggleCard
            title="Composer actions"
            description="Enable AI reply suggestions, translation, and rewrite actions from the message composer."
            enabled={composerActionsEnabled}
            onToggle={() => setComposerActionsEnabled((prev) => !prev)}
          />

          <ToggleCard
            title="Channel summary"
            description="Allow AI-generated summaries for the current channel from the composer actions menu."
            enabled={channelSummaryEnabled}
            onToggle={() => setChannelSummaryEnabled((prev) => !prev)}
          />
        </section>

        <aside className="rounded-3xl border border-gray-800 bg-gray-900/80 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Provider</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{providerLabel}</h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            The desktop build currently routes AI requests through the bundled server. Provider availability depends on runtime key injection.
          </p>

          <div className="mt-5 rounded-2xl border border-emerald-700/30 bg-emerald-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Desktop runtime wired
            </div>
            <p className="mt-2 text-sm leading-6 text-emerald-100/70">
              Current packaged desktop builds pass the OpenRouter key into the bundled web server so AI features can run without manual in-app setup.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-400">
            <p className="font-medium text-white">Included AI features</p>
            <ul className="mt-3 space-y-2">
              <li>• Global AI assistant modal</li>
              <li>• Reply suggestion</li>
              <li>• English translation</li>
              <li>• Rewrite / polish</li>
              <li>• Channel summary</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
