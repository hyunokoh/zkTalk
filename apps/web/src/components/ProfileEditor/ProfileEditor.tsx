'use client';

import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ApiError, api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getUploadErrorMessage } from '@/lib/error-copy';
import { useTranslation } from '@/lib/i18n';
import { isImageFileLike } from '@/lib/file-mime';
import { UserAvatar } from '@/components/UserAvatar';
import { uploadImageAsset } from '@/lib/upload-assets';
import { devLogError } from '@/lib/client-log';
import type { User } from '@zktalk/shared';

const AVATAR_VERSION_STORAGE_KEY = 'zktalk-avatar-version';
const AVATAR_VERSION_EVENT = 'zktalk-avatar-version-updated';
const MAX_AVATAR_FILE_SIZE = 10 * 1024 * 1024;

function getProfileErrorMessage(
  t: (key: string) => string,
  error: unknown,
  context: 'upload' | 'save',
): string {
  if (context === 'upload') {
    return getUploadErrorMessage(t, error, {
      genericKey: 'profile.avatarUploadError',
      tooLargeKey: 'profile.avatarUploadTooLarge',
      invalidTypeKey: 'profile.avatarUploadInvalidType',
      networkKey: 'profile.connectionError',
    });
  }

  if (error instanceof ApiError && error.status >= 500) {
    return t('profile.connectionError');
  }

  if (error instanceof Error && /failed to fetch|networkerror|load failed|connection refused/i.test(error.message)) {
    return t('profile.connectionError');
  }

  return t('profile.saveError');
}

interface ProfileEditorProps {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const showToast = useToastStore((s) => s.showToast);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [success, setSuccess] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarErrorMessage, setAvatarErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarChangedRef = useRef(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {};
      if (displayName !== user?.displayName) body.displayName = displayName;
      if (username !== user?.username) body.username = username;
      if (bio !== (user?.bio ?? '')) body.bio = bio || null;
      if (avatarUrl !== (user?.avatarUrl ?? '')) body.avatarUrl = avatarUrl || null;

      const res = await api<{ user: User }>('/api/me', {
        method: 'PATCH',
        body,
      });
      return res.user;
    },
    onSuccess: (updatedUser) => {
      if (
        (avatarChangedRef.current || updatedUser.avatarUrl !== (user?.avatarUrl ?? null))
        && typeof window !== 'undefined'
      ) {
        const avatarVersion = String(Date.now());
        window.localStorage.setItem(AVATAR_VERSION_STORAGE_KEY, avatarVersion);
        window.dispatchEvent(new Event(AVATAR_VERSION_EVENT));
      }
      avatarChangedRef.current = false;
      setUser(updatedUser);
      setAvatarUrl(updatedUser.avatarUrl ?? '');
      void fetchUser();
      setSuccess(true);
      setAvatarErrorMessage(null);
      setSaveErrorMessage(null);
      showToast({
        tone: 'success',
        message: t('profile.saved'),
      });
      setTimeout(() => setSuccess(false), 2000);
    },
    onError: (error) => {
      avatarChangedRef.current = false;
      const message = getProfileErrorMessage(t, error, 'save');
      setSaveErrorMessage(message);
      showToast({
        tone: 'error',
        message,
      });
    },
  });

  async function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isImageFileLike(file)) {
      const message = t('profile.avatarUploadInvalidType');
      setAvatarErrorMessage(message);
      showToast({ tone: 'error', message });
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      const message = t('profile.avatarUploadTooLarge');
      setAvatarErrorMessage(message);
      showToast({ tone: 'error', message });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setSuccess(false);
      setAvatarErrorMessage(null);
      setSaveErrorMessage(null);
      const uploadedUrl = await uploadImageAsset(file, 'user_avatar');
      setAvatarUrl(uploadedUrl);
      avatarChangedRef.current = true;
    } catch (error) {
      devLogError('Avatar upload failed', error);
      const message = getProfileErrorMessage(t, error, 'upload');
      setAvatarErrorMessage(message);
      showToast({ tone: 'error', message });
      avatarChangedRef.current = false;
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handleBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      data-testid="profile-editor-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle p-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        data-testid="profile-editor"
        className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl dark:border-line dark:bg-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg dark:text-fg-muted">{t('profile.edit')}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-fg-muted hover:bg-bg-hover hover:text-fg dark:text-fg-muted dark:hover:bg-bg-subtle dark:hover:text-fg-muted"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="flex flex-col items-center gap-3">
            <UserAvatar displayName={displayName || '?'} avatarUrl={avatarUrl || null} size="lg" />
            <input
              ref={fileInputRef}
              data-testid="profile-avatar-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              data-testid="profile-avatar-select-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar || mutation.isPending}
              className="rounded-full border border-accent/40 bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
            >
              {isUploadingAvatar || mutation.isPending ? t('attachment.uploading') : t('profile.avatarPhoto')}
            </button>
            <p className="text-xs text-fg-muted">{t('profile.avatarUploadHint')}</p>
            {avatarErrorMessage ? (
              <p data-testid="profile-avatar-error" className="text-xs text-danger">
                {avatarErrorMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-fg dark:text-fg-muted">
              {t('profile.displayName')}
            </label>
            <input
              type="text"
              data-testid="profile-display-name-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
              maxLength={50}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg dark:text-fg-muted">
              {t('profile.username')}
            </label>
            <input
              type="text"
              data-testid="profile-username-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
              maxLength={30}
              pattern="^[a-zA-Z0-9_]+$"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-fg dark:text-fg-muted">
              {t('profile.bio')}
            </label>
            <textarea
              data-testid="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-line dark:bg-bg-subtle dark:text-fg-muted"
              rows={3}
              maxLength={200}
              placeholder={t('profile.bioPlaceholder')}
            />
          </div>

        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          {success && (
            <span className="text-sm text-success">{t('profile.saved')}</span>
          )}
          {saveErrorMessage && (
            <span data-testid="profile-save-error" className="text-sm text-danger">
              {saveErrorMessage}
            </span>
          )}
          <button
            data-testid="profile-cancel-button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-fg hover:bg-bg-hover dark:text-fg-muted dark:hover:bg-bg-subtle"
          >
            {t('common.cancel')}
          </button>
          <button
            data-testid="profile-save-button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isUploadingAvatar}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
          >
            {mutation.isPending ? t('settings.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
