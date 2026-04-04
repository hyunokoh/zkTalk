'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface CreateEventModalProps {
  communityId: string;
  onClose: () => void;
  event?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    startAt: string;
    endAt: string | null;
  };
}

function toDatetimeLocalValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateEventModal({ communityId, onClose, event }: CreateEventModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditing = !!event;
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [startAt, setStartAt] = useState(toDatetimeLocalValue(event?.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocalValue(event?.endAt));

  const saveMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      location?: string;
      startAt: string;
      endAt?: string;
    }) =>
      isEditing && event
        ? api(`/api/events/${event.id}`, { method: 'PATCH', body: data })
        : api(`/api/communities/${communityId}/events`, { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', communityId] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startAt) return;

    saveMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="create-event-modal"
    >
      <div
        className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800"
        data-testid="create-event-panel"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEditing ? t('common.edit') : t('event.create')}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" data-testid="create-event-form">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('event.title')}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="create-event-title-input"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('community.description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              data-testid="create-event-description-input"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('event.location')}
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Channel ID or URL"
              data-testid="create-event-location-input"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('event.start')}
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
                data-testid="create-event-start-input"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('event.end')}
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                data-testid="create-event-end-input"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="create-event-cancel-button"
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending || !title.trim() || !startAt}
              data-testid="create-event-submit-button"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending
                ? t('common.loading')
                : isEditing
                  ? t('common.save')
                  : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
