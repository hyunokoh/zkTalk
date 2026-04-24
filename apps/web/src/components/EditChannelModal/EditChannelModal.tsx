'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Channel } from '@zktalk/shared';

interface EditChannelModalProps {
  channel: Channel;
  communityId: string;
  onClose: () => void;
}

export function EditChannelModal({ channel, communityId, onClose }: EditChannelModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? '');
  const [visibility, setVisibility] = useState<'public' | 'role_restricted'>(
    (channel.visibility as 'public' | 'role_restricted') ?? 'public',
  );
  const [slowModeSeconds, setSlowModeSeconds] = useState(channel.slowModeSeconds ?? 0);
  const [disappearingDuration, setDisappearingDuration] = useState<number | null>(
    channel.disappearingDuration ?? null,
  );
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateChannel = useMutation({
    mutationFn: () =>
      api<Channel>(`/api/channels/${channel.id}`, {
        method: 'PATCH',
        body: {
          name,
          description: description || undefined,
          visibility,
          slowModeSeconds,
          disappearingDuration,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', communityId] });
      onClose();
    },
  });

  const archiveChannel = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channel.id}/archive`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', communityId] });
      onClose();
    },
  });

  const deleteChannel = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channel.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', communityId] });
      onClose();
      router.refresh();
    },
  });

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      updateChannel.mutate();
    },
    [name, updateChannel],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-bg-subtle p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-fg-muted">{t('channel.edit')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel type (read-only) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-muted">{t('channel.type')}</label>
            <div className="rounded-md bg-bg-subtle px-3 py-2 text-sm text-fg-muted">
              {channel.type === 'chat'
                ? t('channel.chat')
                : channel.type === 'announcement'
                  ? t('channel.announcement')
                  : t('channel.forum')}
            </div>
          </div>

          {/* Channel name */}
          <div>
            <label htmlFor="edit-channel-name" className="mb-1.5 block text-sm font-medium text-fg-muted">
              {t('channel.name')}
            </label>
            <input
              id="edit-channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-channel-desc" className="mb-1.5 block text-sm font-medium text-fg-muted">
              {t('channel.description')} <span className="text-fg-muted">{t('common.optional')}</span>
            </label>
            <textarea
              id="edit-channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('channel.descPlaceholder')}
              rows={2}
              className="w-full resize-none rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-muted">{t('channel.visibility')}</label>
            <div className="flex gap-2">
              {([
                { value: 'public' as const, label: t('channel.publicChannel') },
                { value: 'role_restricted' as const, label: t('channel.restrictedChannel') },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    visibility === opt.value
                      ? 'bg-accent text-white'
                      : 'bg-bg-subtle text-fg-muted hover:bg-bg-subtle'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slow Mode */}
          <div>
            <label htmlFor="edit-slow-mode" className="mb-1.5 block text-sm font-medium text-fg-muted">
              {t('channel.slowMode')}
            </label>
            <input
              id="edit-slow-mode"
              type="number"
              min={0}
              value={slowModeSeconds}
              onChange={(e) => setSlowModeSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-fg-muted">{t('channel.slowModeDesc')}</p>
          </div>

          {/* Disappearing Messages */}
          <div>
            <label htmlFor="edit-disappearing" className="mb-1.5 block text-sm font-medium text-fg-muted">
              {t('disappearing.title')}
            </label>
            <select
              id="edit-disappearing"
              value={disappearingDuration ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setDisappearingDuration(val === 0 ? null : val);
              }}
              className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value={0}>{t('disappearing.off')}</option>
              <option value={30}>{t('disappearing.30s')}</option>
              <option value={300}>{t('disappearing.5m')}</option>
              <option value={3600}>{t('disappearing.1h')}</option>
              <option value={86400}>{t('disappearing.24h')}</option>
            </select>
          </div>

          {/* Error */}
          {updateChannel.isError && (
            <p className="text-sm text-danger">
              {(updateChannel.error as Error).message || t('channel.editError')}
            </p>
          )}

          {/* Archive section */}
          <div className="border-t border-line pt-4">
            {!showArchiveConfirm ? (
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(true)}
                className="rounded-md bg-danger/20 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/30"
              >
                {t('channel.archive')}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-danger">{t('channel.archiveConfirm')}</p>
                {archiveChannel.isError && (
                  <p className="text-sm text-danger">
                    {(archiveChannel.error as Error).message || t('channel.archiveError')}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => archiveChannel.mutate()}
                    disabled={archiveChannel.isPending}
                    className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArchiveConfirm(false)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg-muted"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Delete section */}
          <div className="border-t border-line pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteChannel.isPending}
              className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteChannel.isPending ? t('common.loading') : t('channel.delete')}
            </button>
            {deleteChannel.isError && (
              <p className="mt-2 text-sm text-danger">
                {(deleteChannel.error as Error).message || t('channel.deleteError')}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg-muted"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || updateChannel.isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateChannel.isPending ? t('channel.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('channel.delete')}
        description={t('channel.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        tone="danger"
        isPending={deleteChannel.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          deleteChannel.mutate(undefined, {
            onSuccess: () => {
              setShowDeleteConfirm(false);
            },
            onError: () => {
              setShowDeleteConfirm(false);
            },
          });
        }}
      />
    </div>
  );
}
