'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';

interface ContactMatch {
  phoneHash: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface ContactPickerContact {
  tel?: string[];
}

interface ContactPickerNavigator extends Navigator {
  contacts?: {
    select(
      properties: Array<'tel'>,
      options?: { multiple?: boolean },
    ): Promise<ContactPickerContact[]>;
  };
}

/**
 * Hash a phone number using SHA-256 (Web Crypto API).
 * Phone numbers should be normalized to E.164 format before hashing.
 */
async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Normalize a phone number to E.164 format.
 * Examples: "010-1234-5678" -> "+821012345678", "+1 555 123 4567" -> "+15551234567"
 */
function normalizePhoneNumber(phone: string, defaultCountryCode = '+82'): string {
  // Strip all non-digit and non-plus characters
  const cleaned = phone.replace(/[^+\d]/g, '');

  // If it starts with +, leave as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If it starts with 0 (Korean local format), replace leading 0 with country code
  if (cleaned.startsWith('0')) {
    return defaultCountryCode + cleaned.substring(1);
  }

  // Otherwise, prepend default country code
  return defaultCountryCode + cleaned;
}

export function ContactSync() {
  const { t } = useTranslation();
  const [manualPhones, setManualPhones] = useState('');
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch suggestions (mutual discovery)
  const { data: suggestions } = useQuery({
    queryKey: ['contact-suggestions'],
    queryFn: async () => {
      const res = await api<{ suggestions: ContactMatch[] }>('/api/contacts/suggestions');
      return res.suggestions ?? [];
    },
    staleTime: 60_000,
  });

  // Sync contacts mutation
  const syncMutation = useMutation({
    mutationFn: async (hashes: string[]) => {
      const res = await api<{ matches: ContactMatch[] }>('/api/contacts/sync', {
        method: 'POST',
        body: { hashes },
      });
      return res.matches ?? [];
    },
    onSuccess: (data) => {
      setMatches(data);
      setHasSearched(true);
    },
  });

  // Send friend request mutation
  const addFriendMutation = useMutation({
    mutationFn: async (addresseeId: string) => {
      await api('/api/friends/request', {
        method: 'POST',
        body: { userId: addresseeId },
      });
    },
  });

  /**
   * Try to use the Contact Picker API (available on mobile Chrome).
   * Falls back to manual input.
   */
  const handleContactPicker = useCallback(async () => {
    try {
      const contactNavigator = navigator as ContactPickerNavigator;

      // Check for Contact Picker API support
      if (contactNavigator.contacts && 'ContactsManager' in window) {
        const contacts = await contactNavigator.contacts.select(
          ['tel'],
          { multiple: true },
        );

        if (!contacts || contacts.length === 0) return;

        const phones: string[] = [];
        for (const contact of contacts) {
          if (contact.tel) {
            for (const tel of contact.tel) {
              phones.push(tel);
            }
          }
        }

        if (phones.length === 0) return;

        // Normalize and hash all phone numbers
        const hashes = await Promise.all(
          phones.map(async (phone: string) => {
            const normalized = normalizePhoneNumber(phone);
            return sha256Hash(normalized);
          }),
        );

        syncMutation.mutate(hashes);
      } else {
        // Fallback: show manual input
        // The manual input section is always visible as fallback
      }
    } catch {
      // Contact Picker API not supported or user cancelled
    }
  }, [syncMutation]);

  /**
   * Handle manual phone number input submission.
   */
  const handleManualSync = useCallback(async () => {
    const lines = manualPhones
      .split(/[\n,]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const hashes = await Promise.all(
      lines.map(async (phone) => {
        const normalized = normalizePhoneNumber(phone);
        return sha256Hash(normalized);
      }),
    );

    syncMutation.mutate(hashes);
  }, [manualPhones, syncMutation]);

  const handleAddAll = useCallback(() => {
    for (const match of matches) {
      if (!addFriendMutation.isPending) {
        addFriendMutation.mutate(match.userId);
      }
    }
  }, [matches, addFriendMutation]);

  const allSuggestions = [
    ...(suggestions ?? []),
    ...matches.filter(
      (m) => !(suggestions ?? []).some((s) => s.userId === m.userId),
    ),
  ];

  return (
    <div className="space-y-4">
      {/* Contact Picker / Manual Input */}
      <div className="rounded-lg border border-line bg-bg-subtle/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-fg-muted">
          {t('contacts.sync')}
        </h3>

        {/* Contact Picker Button (primary action) */}
        <button
          onClick={handleContactPicker}
          disabled={syncMutation.isPending}
          className="mb-3 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncMutation.isPending ? t('contacts.syncing') : t('contacts.sync')}
        </button>

        {/* Manual phone input fallback */}
        <div className="space-y-2">
          <textarea
            value={manualPhones}
            onChange={(e) => setManualPhones(e.target.value)}
            placeholder="010-1234-5678&#10;+821098765432&#10;..."
            rows={3}
            className="w-full resize-none rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleManualSync}
            disabled={!manualPhones.trim() || syncMutation.isPending}
            className="rounded-md bg-bg-subtle px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncMutation.isPending ? t('contacts.syncing') : t('contacts.sync')}
          </button>
        </div>
      </div>

      {/* Results */}
      {hasSearched && matches.length === 0 && (
        <p className="text-sm text-fg-muted">{t('contacts.noResults')}</p>
      )}

      {allSuggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-fg-muted">
              {t('contacts.found', { count: allSuggestions.length })}
            </p>
            {allSuggestions.length > 1 && (
              <button
                onClick={handleAddAll}
                className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent"
              >
                {t('contacts.addAll')}
              </button>
            )}
          </div>

          <div className="space-y-1">
            {allSuggestions.map((user) => (
              <div
                key={user.userId}
                className="flex items-center justify-between rounded-md border border-line bg-bg-subtle/50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    displayName={user.displayName}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-fg-muted">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-fg-muted">@{user.username}</p>
                  </div>
                </div>
                <button
                  onClick={() => addFriendMutation.mutate(user.userId)}
                  disabled={addFriendMutation.isPending}
                  className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent disabled:opacity-50"
                >
                  {t('friend.add')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
