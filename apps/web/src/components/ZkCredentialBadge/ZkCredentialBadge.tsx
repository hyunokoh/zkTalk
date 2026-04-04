'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

interface ZkCredential {
  id: string;
  credentialType: string;
  isVerified: boolean;
  metadata: string | null;
  createdAt: string;
}

interface ZkCredentialBadgeProps {
  userId: string;
}

const BADGE_LABELS: Record<string, { en: string; icon: string }> = {
  age_verified: { en: 'zkId.ageVerified', icon: 'checkCircle' },
  org_member: { en: 'zkId.orgMember', icon: 'building' },
  email_verified: { en: 'zkId.emailVerified', icon: 'mail' },
  phone_verified: { en: 'zkId.phoneVerified', icon: 'phone' },
};

export function ZkCredentialBadge({ userId }: ZkCredentialBadgeProps) {
  const { t } = useTranslation();

  const { data: credentials } = useQuery({
    queryKey: ['zk-credentials', userId],
    queryFn: async () => {
      const res = await api<{ credentials: ZkCredential[] }>(
        `/api/users/${userId}/zk-credentials`,
      );
      return res.credentials;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!credentials || credentials.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {credentials.map((credential) => {
        const badge = BADGE_LABELS[credential.credentialType];
        const label = badge
          ? t(badge.en)
          : credential.credentialType;

        // Parse metadata for custom label if present
        let metadataLabel: string | null = null;
        if (credential.metadata) {
          try {
            const parsed = JSON.parse(credential.metadata);
            metadataLabel = parsed.label ?? null;
          } catch {
            // ignore parse errors
          }
        }

        return (
          <span
            key={credential.id}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              credential.isVerified
                ? 'bg-green-900/50 text-green-400'
                : 'bg-gray-700 text-gray-400'
            }`}
            title={metadataLabel ?? label}
          >
            {credential.isVerified && (
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {metadataLabel ?? label}
          </span>
        );
      })}
    </div>
  );
}
