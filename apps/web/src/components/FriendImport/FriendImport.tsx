'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { UserAvatar } from '@/components/UserAvatar';
import { useToastStore } from '@/stores/toast';

interface ContactMatch {
  phoneHash: string;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface ParsedContact {
  name: string | null;
  phones: string[];
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizePhone(phone: string, defaultCountryCode = '+82'): string {
  const cleaned = phone.replace(/[^+\d]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (cleaned.startsWith('0')) return defaultCountryCode + cleaned.slice(1);
  return defaultCountryCode + cleaned;
}

// vCard 2.1/3.0/4.0 parser. Handles line folding (continuation lines start
// with space/tab) and the common TYPE= variants for TEL fields.
function parseVCard(text: string): ParsedContact[] {
  const unfolded: string[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if ((raw.startsWith(' ') || raw.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += raw.slice(1);
    } else {
      unfolded.push(raw);
    }
  }

  const contacts: ParsedContact[] = [];
  let current: ParsedContact | null = null;
  for (const line of unfolded) {
    const upper = line.toUpperCase();
    if (upper.startsWith('BEGIN:VCARD')) {
      current = { name: null, phones: [] };
      continue;
    }
    if (upper.startsWith('END:VCARD')) {
      if (current && current.phones.length > 0) contacts.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const left = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1).trim();
    const propName = left.split(';')[0]?.toUpperCase();

    if (propName === 'FN' && value) {
      current.name = value;
    } else if (propName === 'N' && !current.name && value) {
      // N is structured: family;given;additional;prefix;suffix
      const parts = value.split(';').map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) current.name = parts.slice(0, 2).reverse().join(' ');
    } else if (propName === 'TEL' && value) {
      current.phones.push(value);
    }
  }
  return contacts;
}

// Minimal CSV parser supporting quoted fields with embedded commas/newlines
// and "" escaping. Good enough for Google Contacts / iCloud / Outlook exports.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function parseCSVContacts(text: string): ParsedContact[] {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0]!.map((h) => h.trim().toLowerCase());

  const nameIdx = header.findIndex((h) =>
    /(^| )name$|display name|full name|이름/i.test(h),
  );
  // Match value columns; exclude "Phone 1 - Type" / "Label" sidecar columns
  // that Google Contacts emits next to each number.
  const phoneIdxs = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /phone|tel|mobile|전화|휴대|모바일/i.test(h))
    .filter(({ h }) => !/type|label|구분|종류/i.test(h))
    .map(({ i }) => i);

  if (phoneIdxs.length === 0) return [];

  const contacts: ParsedContact[] = [];
  for (const row of rows.slice(1)) {
    const phones: string[] = [];
    for (const idx of phoneIdxs) {
      const v = row[idx]?.trim();
      if (!v) continue;
      // Phones can be ::: separated in Google Contacts exports
      for (const p of v.split(/\s*[:;\/]\s+|\s* ::: \s*/)) {
        if (p.trim()) phones.push(p.trim());
      }
    }
    if (phones.length === 0) continue;
    contacts.push({
      name: nameIdx >= 0 ? row[nameIdx]?.trim() || null : null,
      phones,
    });
  }
  return contacts;
}

interface ParseResult {
  contacts: ParsedContact[];
  totalPhones: number;
  fileName: string;
}

async function parseFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lower = file.name.toLowerCase();
  const looksLikeVCard =
    lower.endsWith('.vcf') ||
    lower.endsWith('.vcard') ||
    text.toUpperCase().includes('BEGIN:VCARD');
  const contacts = looksLikeVCard ? parseVCard(text) : parseCSVContacts(text);
  const totalPhones = contacts.reduce((acc, c) => acc + c.phones.length, 0);
  return { contacts, totalPhones, fileName: file.name };
}

export function FriendImport() {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

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
      showToast({
        tone: 'success',
        message: t('friendImport.toastSynced', { count: data.length }),
      });
    },
    onError: (err) => {
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : t('friendImport.toastError'),
      });
    },
  });

  const addFriendMutation = useMutation({
    mutationFn: async (addresseeId: string) => {
      await api('/api/friends/request', {
        method: 'POST',
        body: { userId: addresseeId },
      });
    },
    onSuccess: () => {
      showToast({ tone: 'success', message: t('friend.requestSent') });
    },
    onError: (err) => {
      showToast({
        tone: 'error',
        message: err instanceof Error ? err.message : t('friendImport.toastError'),
      });
    },
  });

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const result = await parseFile(file);
        setParseResult(result);
        setMatches([]);
        setHasSearched(false);
        if (result.totalPhones === 0) {
          showToast({ tone: 'error', message: t('friendImport.noPhonesFound') });
        }
      } catch {
        showToast({ tone: 'error', message: t('friendImport.parseError') });
      }
    },
    [showToast, t],
  );

  const handleSync = useCallback(async () => {
    if (!parseResult || parseResult.totalPhones === 0) return;
    const phones = parseResult.contacts.flatMap((c) => c.phones);
    const normalized = Array.from(
      new Set(phones.map((p) => normalizePhone(p)).filter((p) => p.length >= 8)),
    );
    if (normalized.length === 0) {
      showToast({ tone: 'error', message: t('friendImport.noPhonesFound') });
      return;
    }
    const hashes = await Promise.all(normalized.map((p) => sha256Hex(p)));
    syncMutation.mutate(hashes);
  }, [parseResult, syncMutation, showToast, t]);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setMatches([]);
    setHasSearched(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div
      className="rounded-lg border border-line bg-bg-subtle/50 p-4"
      data-testid="friend-import"
    >
      <h3 className="mb-1 text-sm font-semibold text-fg-muted">
        {t('friendImport.title')}
      </h3>
      <p className="mb-3 text-xs text-fg-subtle">{t('friendImport.help')}</p>

      <input
        ref={inputRef}
        type="file"
        accept=".vcf,.vcard,.csv,text/vcard,text/csv"
        className="hidden"
        data-testid="friend-import-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {!parseResult ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg border border-dashed border-line bg-bg-subtle px-4 py-3 text-sm text-fg-muted hover:border-accent hover:text-fg"
          data-testid="friend-import-pick"
        >
          {t('friendImport.pickFile')}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-line bg-bg px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">
                {parseResult.fileName}
              </p>
              <p className="text-xs text-fg-muted">
                {t('friendImport.parsedSummary', {
                  contacts: parseResult.contacts.length,
                  phones: parseResult.totalPhones,
                })}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="ml-3 shrink-0 rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover"
            >
              {t('common.cancel')}
            </button>
          </div>

          <button
            onClick={() => void handleSync()}
            disabled={parseResult.totalPhones === 0 || syncMutation.isPending}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="friend-import-sync"
          >
            {syncMutation.isPending
              ? t('contacts.syncing')
              : t('friendImport.findOnZktalk')}
          </button>
        </div>
      )}

      {hasSearched && matches.length === 0 && (
        <p className="mt-3 text-sm text-fg-muted">{t('contacts.noResults')}</p>
      )}

      {matches.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-fg-muted">
            {t('contacts.found', { count: matches.length })}
          </p>
          {matches.map((user) => (
            <div
              key={user.userId}
              className="flex items-center justify-between rounded-md border border-line bg-bg-subtle/50 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  displayName={user.displayName}
                  avatarUrl={user.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg-muted">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    @{user.username}
                  </p>
                </div>
              </div>
              <button
                onClick={() => addFriendMutation.mutate(user.userId)}
                disabled={addFriendMutation.isPending}
                className="ml-3 shrink-0 rounded-md bg-accent px-3 py-1 text-xs font-medium text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-50"
              >
                {t('friend.add')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
