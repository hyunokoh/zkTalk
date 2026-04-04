'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface PollCreatorProps {
  channelId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function PollCreator({ channelId, onClose, onCreated }: PollCreatorProps) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [anonymous, setAnonymous] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [expiresHours, setExpiresHours] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channelId}/polls`, {
        method: 'POST',
        body: {
          question,
          options: options.filter((o) => o.trim()),
          isAnonymous: anonymous,
          allowMultiple: multiple,
          expiresInHours: expiresHours ? Number(expiresHours) : undefined,
        },
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  const addOption = useCallback(() => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  }, [options]);

  const removeOption = useCallback(
    (index: number) => {
      if (options.length > 2) {
        setOptions(options.filter((_, i) => i !== index));
      }
    },
    [options],
  );

  const updateOption = useCallback(
    (index: number, value: string) => {
      const updated = [...options];
      updated[index] = value;
      setOptions(updated);
    },
    [options],
  );

  const canSubmit = question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <div
      data-testid="poll-creator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        data-testid="poll-creator-panel"
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-100">{t('poll.create')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Question */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">{t('poll.question')}</label>
            <input
              data-testid="poll-creator-question-input"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('poll.questionPlaceholder')}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  data-testid={`poll-creator-option-input-${i}`}
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={t('poll.option', { num: i + 1 })}
                  className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="shrink-0 rounded px-2 py-1 text-xs text-red-400 hover:bg-gray-800"
                  >
                    {t('poll.removeOption')}
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                data-testid="poll-creator-add-option-button"
                onClick={addOption}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                + {t('poll.addOption')}
              </button>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                data-testid="poll-creator-anonymous-toggle"
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              {t('poll.anonymous')}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                data-testid="poll-creator-multiple-toggle"
                type="checkbox"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
              />
              {t('poll.multiple')}
            </label>
          </div>

          {/* Expiry */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-400">
              {t('poll.expires')} {t('common.optional')}
            </label>
            <input
              data-testid="poll-creator-expires-input"
              type="number"
              min="1"
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
              className="w-24 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              data-testid="poll-creator-cancel-button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-gray-400 hover:text-gray-200"
            >
              {t('common.cancel')}
            </button>
            <button
              data-testid="poll-creator-submit-button"
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit || createMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {createMutation.isPending ? t('common.loading') : t('common.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
