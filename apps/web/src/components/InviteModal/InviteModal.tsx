'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface Invite {
  id: string;
  code: string;
  maxUses: number | null;
  expiresAt: string | null;
}

interface InviteModalProps {
  communityId: string;
  onClose: () => void;
}

export function InviteModal({ communityId, onClose }: InviteModalProps) {
  const { t } = useTranslation();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvite = useMutation({
    mutationFn: () =>
      api<{ invite: Invite }>(`/api/communities/${communityId}/invites`, {
        method: 'POST',
        body: { expiresInHours: 168 },
      }),
    onSuccess: (data) => {
      const link = `${window.location.origin}/invite/${data.invite.code}`;
      setInviteLink(link);
    },
  });

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-bg-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-fg-muted">{t('invite.inviteMembers')}</h2>

        {!inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-fg-subtle">{t('invite.linkExpiry')}</p>
            <button
              type="button"
              onClick={() => createInvite.mutate()}
              disabled={createInvite.isPending}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createInvite.isPending ? t('common.loading') : t('invite.createLink')}
            </button>
            {createInvite.isError && (
              <p className="text-sm text-danger">
                {(createInvite.error as Error).message}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg focus:outline-none dark:bg-bg-subtle"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-success text-white'
                    : 'bg-accent text-[color:var(--on-accent)] hover:bg-accent-strong'
                }`}
              >
                {copied ? t('invite.copied') : t('invite.copyLink')}
              </button>
            </div>
            <p className="text-xs text-fg-muted">{t('invite.linkExpiry')}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-fg hover:text-fg-muted dark:hover:text-fg"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
