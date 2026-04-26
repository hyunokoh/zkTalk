'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import type { CreateBusinessCardInput } from '@zktalk/shared';
import {
  createBusinessCard,
  extractBusinessCard,
} from '@/lib/api-business-cards';
import { uploadImageAsset } from '@/lib/upload-assets';
import { isImageFileLike } from '@/lib/file-mime';
import { useTranslation } from '@/lib/i18n';
import { useToastStore } from '@/stores/toast';

type RowStatus = 'uploading' | 'extracting' | 'ready' | 'saving' | 'saved' | 'error';

interface BulkRow {
  id: string;
  fileName: string;
  cardImageUrl: string | null;
  status: RowStatus;
  errorMessage?: string;
  fields: {
    displayName: string;
    company: string;
    jobTitle: string;
    phone: string;
    email: string;
    address: string;
    website: string;
  };
}

const EMPTY_FIELDS: BulkRow['fields'] = {
  displayName: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  address: '',
  website: '',
};

function makeRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CardsBulkImport({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  const updateRow = useCallback((id: string, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const updateField = useCallback(
    (id: string, field: keyof BulkRow['fields'], value: string) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, fields: { ...r.fields, [field]: value } } : r,
        ),
      );
    },
    [],
  );

  const handleFiles = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      if (files.length === 0) return;

      const accepted = files.filter((f) => isImageFileLike(f));
      const rejected = files.length - accepted.length;
      if (rejected > 0) {
        showToast({ tone: 'error', message: t('cards.toastInvalidImage') });
      }
      if (accepted.length === 0) return;

      const newRows: BulkRow[] = accepted.map((file) => ({
        id: makeRowId(),
        fileName: file.name,
        cardImageUrl: null,
        status: 'uploading',
        fields: { ...EMPTY_FIELDS },
      }));
      setRows((prev) => [...prev, ...newRows]);

      // Upload + OCR in parallel for each new file. We deliberately don't
      // await Promise.all here so each row can update its status as soon
      // as it finishes — slow rows don't block fast ones.
      newRows.forEach((row, i) => {
        const file = accepted[i]!;
        void (async () => {
          try {
            const url = await uploadImageAsset(file, 'user_avatar');
            updateRow(row.id, { cardImageUrl: url, status: 'extracting' });
            try {
              const fields = await extractBusinessCard(url);
              updateRow(row.id, {
                status: 'ready',
                fields: {
                  displayName: fields.displayName ?? '',
                  company: fields.company ?? '',
                  jobTitle: fields.jobTitle ?? '',
                  phone: fields.phone ?? '',
                  email: fields.email ?? '',
                  address: fields.address ?? '',
                  website: fields.website ?? '',
                },
              });
            } catch (err) {
              // Image uploaded successfully, but OCR failed (e.g., AI_API_KEY
              // not set). Keep the row so the user can fill in manually.
              updateRow(row.id, {
                status: 'ready',
                errorMessage:
                  err instanceof Error ? err.message : 'OCR failed',
              });
            }
          } catch (err) {
            updateRow(row.id, {
              status: 'error',
              errorMessage:
                err instanceof Error ? err.message : 'Upload failed',
            });
          }
        })();
      });
    },
    [showToast, t, updateRow],
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleSaveAll = useCallback(async () => {
    const saveable = rows.filter(
      (r) => r.status === 'ready' && r.fields.displayName.trim().length > 0,
    );
    if (saveable.length === 0) {
      showToast({ tone: 'error', message: t('cards.bulkNeedNames') });
      return;
    }
    setSavingAll(true);

    const results = await Promise.allSettled(
      saveable.map(async (row) => {
        updateRow(row.id, { status: 'saving' });
        const input: CreateBusinessCardInput = {
          displayName: row.fields.displayName.trim(),
          company: row.fields.company.trim() || null,
          jobTitle: row.fields.jobTitle.trim() || null,
          phone: row.fields.phone.trim() || null,
          email: row.fields.email.trim() || null,
          address: row.fields.address.trim() || null,
          website: row.fields.website.trim() || null,
          notes: null,
          cardImageUrl: row.cardImageUrl ?? null,
          personPhotoUrl: null,
        };
        await createBusinessCard(input);
        updateRow(row.id, { status: 'saved' });
        return row.id;
      }),
    );

    const failures = results.filter((r) => r.status === 'rejected').length;
    setSavingAll(false);

    if (failures === 0) {
      showToast({
        tone: 'success',
        message: t('cards.bulkSavedToast', { count: saveable.length }),
      });
      onSaved();
      // Drop the saved rows; keep any that the user explicitly skipped
      // (no display name) so they can finish them.
      setRows((prev) => prev.filter((r) => r.status !== 'saved'));
      if (rows.every((r) => r.status === 'saved')) {
        onClose();
      }
    } else {
      showToast({
        tone: 'error',
        message: t('cards.bulkPartialFail', { count: failures }),
      });
      onSaved();
    }
  }, [rows, onSaved, onClose, showToast, t, updateRow]);

  if (!open) return null;

  const readyCount = rows.filter((r) => r.status === 'ready').length;
  const inFlight = rows.some((r) => r.status === 'uploading' || r.status === 'extracting');

  return (
    <div
      data-testid="cards-bulk-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-bg-elevated"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('cards.bulkTitle')}</h2>
            <p className="text-xs text-fg-muted">{t('cards.bulkHint')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm text-fg-muted hover:bg-bg-hover"
          >
            {t('common.cancel')}
          </button>
        </header>

        <div className="flex items-center gap-3 border-b border-line bg-bg-subtle/40 px-6 py-3">
          <label
            className="cursor-pointer rounded-md border border-dashed border-line bg-bg px-4 py-2 text-sm text-fg-muted hover:border-accent hover:text-fg"
            data-testid="cards-bulk-pick"
          >
            {t('cards.bulkPickFiles')}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </label>
          <span className="text-xs text-fg-muted">
            {t('cards.bulkRowsSummary', {
              total: rows.length,
              ready: readyCount,
            })}
          </span>
          <button
            type="button"
            data-testid="cards-bulk-save-all"
            onClick={() => void handleSaveAll()}
            disabled={savingAll || readyCount === 0 || inFlight}
            className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savingAll ? t('cards.bulkSaving') : t('cards.bulkSaveAll', { count: readyCount })}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex h-full min-h-[200px] items-center justify-center px-6 py-12 text-center text-sm text-fg-muted">
              {t('cards.bulkEmpty')}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:gap-4"
                  data-testid={`cards-bulk-row-${row.id}`}
                >
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    {row.cardImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cardImageUrl}
                        alt=""
                        className="h-20 w-32 rounded-md border border-line object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-32 items-center justify-center rounded-md border border-dashed border-line bg-bg-subtle text-[10px] text-fg-subtle">
                        {row.fileName}
                      </div>
                    )}
                    <span className="text-[10px] text-fg-muted">
                      {row.status === 'uploading' && t('cards.bulkUploading')}
                      {row.status === 'extracting' && t('cards.bulkExtracting')}
                      {row.status === 'ready' && t('cards.bulkReady')}
                      {row.status === 'saving' && t('cards.bulkRowSaving')}
                      {row.status === 'saved' && t('cards.bulkRowSaved')}
                      {row.status === 'error' && t('cards.bulkRowError')}
                    </span>
                    {row.errorMessage ? (
                      <span className="text-[10px] text-warning" title={row.errorMessage}>
                        {row.errorMessage.slice(0, 30)}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    {(['displayName', 'company', 'jobTitle', 'phone', 'email', 'website'] as const).map(
                      (field) => (
                        <label key={field} className="flex flex-col text-[11px] text-fg-muted">
                          {t(`cards.field.${field}`)}
                          <input
                            type="text"
                            value={row.fields[field]}
                            onChange={(e) =>
                              updateField(row.id, field, e.target.value)
                            }
                            disabled={row.status === 'saving' || row.status === 'saved'}
                            className="mt-1 rounded-md border border-line bg-bg px-2 py-1.5 text-sm text-fg outline-none focus:border-accent"
                          />
                        </label>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={row.status === 'saving'}
                    className="self-start rounded-md px-2 py-1 text-xs text-fg-muted hover:bg-bg-hover hover:text-warning"
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
