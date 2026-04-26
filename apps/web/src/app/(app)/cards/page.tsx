'use client';

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BusinessCard, CreateBusinessCardInput } from '@zktalk/shared';
import {
  createBusinessCard,
  deleteBusinessCard,
  extractBusinessCard,
  fetchBusinessCards,
  updateBusinessCard,
} from '@/lib/api-business-cards';
import { uploadImageAsset } from '@/lib/upload-assets';
import { isImageFileLike } from '@/lib/file-mime';
import { useTranslation } from '@/lib/i18n';
import { useToastStore } from '@/stores/toast';

type EditableField =
  | 'displayName'
  | 'company'
  | 'jobTitle'
  | 'phone'
  | 'email'
  | 'address'
  | 'website'
  | 'notes';

const TEXTAREA_FIELDS = new Set<EditableField>(['address', 'notes']);

interface CardFormState {
  displayName: string;
  company: string;
  jobTitle: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  notes: string;
  cardImageUrl: string | null;
  personPhotoUrl: string | null;
}

const EMPTY_FORM: CardFormState = {
  displayName: '',
  company: '',
  jobTitle: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  notes: '',
  cardImageUrl: null,
  personPhotoUrl: null,
};

function toCreateInput(form: CardFormState): CreateBusinessCardInput {
  return {
    displayName: form.displayName.trim(),
    company: form.company.trim() || null,
    jobTitle: form.jobTitle.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    website: form.website.trim() || null,
    notes: form.notes.trim() || null,
    cardImageUrl: form.cardImageUrl,
    personPhotoUrl: form.personPhotoUrl,
  };
}

function fromCard(card: BusinessCard): CardFormState {
  return {
    displayName: card.displayName,
    company: card.company ?? '',
    jobTitle: card.jobTitle ?? '',
    phone: card.phone ?? '',
    email: card.email ?? '',
    address: card.address ?? '',
    website: card.website ?? '',
    notes: card.notes ?? '',
    cardImageUrl: card.cardImageUrl,
    personPhotoUrl: card.personPhotoUrl,
  };
}

export default function BusinessCardsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);

  const [searchInput, setSearchInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<CardFormState>(EMPTY_FORM);
  const [uploadingCardImage, setUploadingCardImage] = useState(false);
  const [uploadingPersonPhoto, setUploadingPersonPhoto] = useState(false);
  const [extracting, setExtracting] = useState(false);
  // ingestPending = number of newly-picked photos still being processed
  // (upload → OCR → save). Drives the small status pill in the header.
  const [ingestPending, setIngestPending] = useState(0);
  const addInputRef = useRef<HTMLInputElement>(null);

  const cardsQuery = useQuery({
    queryKey: ['business-cards', searchInput.trim()],
    queryFn: () => fetchBusinessCards({ search: searchInput.trim() || undefined }),
    staleTime: 5_000,
  });

  const cards = cardsQuery.data ?? [];

  const activeCard = useMemo(
    () => (activeId ? cards.find((c) => c.id === activeId) ?? null : null),
    [activeId, cards],
  );

  const openCreateEditor = () => {
    setForm(EMPTY_FORM);
    setActiveId(null);
    setEditorOpen(true);
  };

  // "+ 명함 추가" picks one or many photos. Each photo is uploaded,
  // OCR'd, and saved as its own card immediately — no review modal.
  // The user can click any saved card afterwards to correct fields.
  const handleAddPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const accepted = files.filter((f) => isImageFileLike(f));
    if (accepted.length === 0) {
      showToast({ tone: 'error', message: t('cards.toastInvalidImage') });
      return;
    }

    setIngestPending((n) => n + accepted.length);
    let savedCount = 0;
    let failedCount = 0;

    await Promise.all(
      accepted.map(async (file) => {
        try {
          const url = await uploadImageAsset(file, 'user_avatar');
          let extracted: Awaited<ReturnType<typeof extractBusinessCard>> | null = null;
          try {
            extracted = await extractBusinessCard(url);
          } catch {
            // OCR failed (e.g. AI key not set) — still save with image so
            // the user can fill the rest in by tapping the card.
          }
          await createBusinessCard({
            displayName: extracted?.displayName?.trim() || t('cards.untitled'),
            company: extracted?.company ?? null,
            jobTitle: extracted?.jobTitle ?? null,
            phone: extracted?.phone ?? null,
            email: extracted?.email ?? null,
            address: extracted?.address ?? null,
            website: extracted?.website ?? null,
            notes: null,
            cardImageUrl: url,
            personPhotoUrl: null,
          });
          savedCount += 1;
        } catch {
          failedCount += 1;
        } finally {
          setIngestPending((n) => Math.max(0, n - 1));
        }
      }),
    );

    queryClient.invalidateQueries({ queryKey: ['business-cards'] });
    if (savedCount > 0) {
      showToast({
        tone: failedCount > 0 ? 'info' : 'success',
        message: t('cards.bulkSavedToast', { count: savedCount }),
      });
    }
    if (failedCount > 0) {
      showToast({
        tone: 'error',
        message: t('cards.bulkPartialFail', { count: failedCount }),
      });
    }
  };

  const openEditor = (card: BusinessCard) => {
    setForm(fromCard(card));
    setActiveId(card.id);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setForm(EMPTY_FORM);
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateBusinessCardInput) => createBusinessCard(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['business-cards'] });
      setActiveId(created.id);
      setEditorOpen(false);
      showToast({ tone: 'success', message: t('cards.toastCreated') });
    },
    onError: () => showToast({ tone: 'error', message: t('cards.toastSaveError') }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CreateBusinessCardInput }) =>
      updateBusinessCard(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-cards'] });
      setEditorOpen(false);
      showToast({ tone: 'success', message: t('cards.toastSaved') });
    },
    onError: () => showToast({ tone: 'error', message: t('cards.toastSaveError') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteBusinessCard(cardId),
    onSuccess: (_, cardId) => {
      queryClient.invalidateQueries({ queryKey: ['business-cards'] });
      if (activeId === cardId) setActiveId(null);
      showToast({ tone: 'success', message: t('cards.toastDeleted') });
    },
    onError: () => showToast({ tone: 'error', message: t('cards.toastDeleteError') }),
  });

  const handleField = (field: EditableField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageFile = async (
    e: ChangeEvent<HTMLInputElement>,
    target: 'cardImageUrl' | 'personPhotoUrl',
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isImageFileLike(file)) {
      showToast({ tone: 'error', message: t('cards.toastInvalidImage') });
      return;
    }
    if (target === 'cardImageUrl') setUploadingCardImage(true);
    else setUploadingPersonPhoto(true);
    try {
      const url = await uploadImageAsset(file, 'user_avatar');
      setForm((prev) => ({ ...prev, [target]: url }));
    } catch {
      showToast({ tone: 'error', message: t('cards.toastUploadError') });
    } finally {
      if (target === 'cardImageUrl') setUploadingCardImage(false);
      else setUploadingPersonPhoto(false);
    }
  };

  const handleExtract = async () => {
    if (!form.cardImageUrl || extracting) return;
    setExtracting(true);
    try {
      const fields = await extractBusinessCard(form.cardImageUrl);
      // Merge non-null extracted fields into the form. Existing user-typed
      // values win — auto-extract only fills empty slots so we don't
      // clobber a manual correction.
      setForm((prev) => ({
        ...prev,
        displayName: prev.displayName || fields.displayName || '',
        company: prev.company || fields.company || '',
        jobTitle: prev.jobTitle || fields.jobTitle || '',
        phone: prev.phone || fields.phone || '',
        email: prev.email || fields.email || '',
        address: prev.address || fields.address || '',
        website: prev.website || fields.website || '',
      }));
      showToast({ tone: 'success', message: t('cards.toastExtracted') });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : t('cards.toastExtractError');
      showToast({ tone: 'error', message });
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = toCreateInput(form);
    if (!input.displayName) {
      showToast({ tone: 'error', message: t('cards.toastNameRequired') });
      return;
    }
    if (activeId) {
      updateMutation.mutate({ id: activeId, patch: input });
    } else {
      createMutation.mutate(input);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section
      data-testid="business-cards-page"
      className="flex min-h-0 flex-1 flex-col bg-bg text-fg"
    >
      <header className="flex h-14 items-center gap-3 border-b border-line bg-bg px-6">
        <h1 className="text-[15px] font-semibold text-fg">{t('cards.title')}</h1>
        <span className="text-[12px] text-fg-muted">
          {t('cards.countLabel', { count: cards.length })}
        </span>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('cards.searchPlaceholder')}
          className="ml-4 h-8 w-64 rounded-md border border-line bg-bg-elevated px-3 text-[13px] text-fg outline-none focus:border-accent"
        />
        {ingestPending > 0 ? (
          <span
            className="ml-auto inline-flex items-center gap-2 rounded-pill border border-line bg-bg-subtle px-3 py-1 text-[11px] text-fg-muted"
            data-testid="cards-ingest-status"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-accent" />
            {t('cards.ingestPending', { count: ingestPending })}
          </span>
        ) : null}
        <input
          ref={addInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleAddPhotos(e)}
          data-testid="cards-add-input"
        />
        <button
          type="button"
          data-testid="cards-add-button"
          onClick={() => addInputRef.current?.click()}
          className={`${ingestPending > 0 ? '' : 'ml-auto'} inline-flex h-8 items-center gap-1 rounded-md bg-accent px-3 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong`}
        >
          + {t('cards.addNew')}
        </button>
        <button
          type="button"
          data-testid="cards-add-blank-button"
          onClick={openCreateEditor}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-bg-elevated px-3 text-[12px] font-semibold text-fg hover:bg-bg-hover"
          title={t('cards.addBlankHint')}
        >
          {t('cards.addBlank')}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ul
          data-testid="cards-list"
          className="w-[320px] shrink-0 overflow-auto border-r border-line bg-bg-subtle/50"
        >
          {cardsQuery.isLoading ? (
            <li className="px-4 py-6 text-[13px] text-fg-muted">{t('common.loading')}</li>
          ) : cards.length === 0 ? (
            <li className="px-4 py-6 text-[13px] text-fg-muted">{t('cards.empty')}</li>
          ) : (
            cards.map((card) => {
              const isActive = activeId === card.id;
              return (
                <li key={card.id}>
                  <button
                    type="button"
                    data-testid={`cards-row-${card.id}`}
                    onClick={() => setActiveId(card.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      isActive ? 'bg-bg-hover' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-[12px] font-semibold text-accent">
                      {card.personPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.personPhotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        card.displayName.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold text-fg">{card.displayName}</span>
                      {card.company || card.jobTitle ? (
                        <span className="truncate text-[11px] text-fg-muted">
                          {[card.jobTitle, card.company].filter(Boolean).join(' · ')}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex min-h-0 flex-1 overflow-auto">
          {activeCard ? (
            <CardDetail
              t={t}
              card={activeCard}
              onEdit={() => openEditor(activeCard)}
              onDelete={() => {
                if (window.confirm(t('cards.deleteConfirm'))) {
                  deleteMutation.mutate(activeCard.id);
                }
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-fg-muted">
              {t('cards.pickHint')}
            </div>
          )}
        </div>
      </div>

      {editorOpen ? (
        <div
          data-testid="cards-editor"
          className="fixed inset-0 z-50 flex items-center justify-center bg-fg/40 backdrop-blur-sm"
          onClick={closeEditor}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-auto rounded-2xl border border-line bg-bg-elevated p-6"
          >
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-fg">
                {activeId ? t('cards.editorEditTitle') : t('cards.editorAddTitle')}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md px-2 py-1 text-[12px] text-fg-muted hover:bg-bg-hover hover:text-fg"
              >
                {t('common.cancel')}
              </button>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePickerField
                t={t}
                label={t('cards.cardImageLabel')}
                hint={t('cards.cardImageHint')}
                value={form.cardImageUrl}
                uploading={uploadingCardImage}
                onChange={(e) => void handleImageFile(e, 'cardImageUrl')}
                onClear={() => setForm((p) => ({ ...p, cardImageUrl: null }))}
                testId="cards-card-image"
              />
              <ImagePickerField
                t={t}
                label={t('cards.personPhotoLabel')}
                hint={t('cards.personPhotoHint')}
                value={form.personPhotoUrl}
                uploading={uploadingPersonPhoto}
                onChange={(e) => void handleImageFile(e, 'personPhotoUrl')}
                onClear={() => setForm((p) => ({ ...p, personPhotoUrl: null }))}
                testId="cards-person-photo"
              />
            </div>

            {form.cardImageUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-soft/30 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-fg">
                    {t('cards.extractTitle')}
                  </p>
                  <p className="text-[11px] leading-4 text-fg-muted">
                    {t('cards.extractHint')}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="cards-extract-button"
                  onClick={() => void handleExtract()}
                  disabled={extracting}
                  className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-[12px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-60"
                >
                  {extracting ? t('cards.extractRunning') : t('cards.extractButton')}
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {(['displayName', 'company', 'jobTitle', 'phone', 'email', 'website', 'address', 'notes'] as EditableField[]).map(
                (field) => (
                  <label
                    key={field}
                    className={`flex flex-col gap-1 ${TEXTAREA_FIELDS.has(field) ? 'sm:col-span-2' : ''}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                      {t(`cards.field.${field}`)}
                      {field === 'displayName' ? ' *' : ''}
                    </span>
                    {TEXTAREA_FIELDS.has(field) ? (
                      <textarea
                        rows={3}
                        value={form[field]}
                        onChange={handleField(field)}
                        className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent"
                      />
                    ) : (
                      <input
                        type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : field === 'website' ? 'url' : 'text'}
                        value={form[field]}
                        onChange={handleField(field)}
                        required={field === 'displayName'}
                        className="rounded-md border border-line bg-bg-elevated px-3 py-2 text-[13px] text-fg placeholder:text-fg-subtle focus:border-accent"
                      />
                    )}
                  </label>
                ),
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-md border border-line px-4 py-2 text-[13px] font-medium text-fg-muted hover:bg-bg-hover hover:text-fg"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                data-testid="cards-save-button"
                className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-[color:var(--on-accent)] hover:bg-accent-strong disabled:opacity-60"
              >
                {isSaving ? t('common.loading') : t('common.save')}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function ImagePickerField({
  t,
  label,
  hint,
  value,
  uploading,
  onChange,
  onClear,
  testId,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  label: string;
  hint: string;
  value: string | null;
  uploading: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  testId: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg-subtle/30 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</span>
      <p className="text-[11px] leading-4 text-fg-subtle">{hint}</p>
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-32 w-full rounded-md object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 rounded-md bg-fg/60 px-2 py-1 text-[10px] font-semibold text-white"
          >
            {t('cards.imageRemove')}
          </button>
        </div>
      ) : (
        <label
          className={`flex h-32 cursor-pointer items-center justify-center rounded-md border border-dashed border-line text-[12px] text-fg-muted transition hover:border-accent hover:text-fg ${
            uploading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {uploading ? t('common.loading') : t('cards.imagePick')}
          <input
            type="file"
            accept="image/*"
            data-testid={`${testId}-input`}
            onChange={onChange}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

function CardDetail({
  t,
  card,
  onEdit,
  onDelete,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  card: BusinessCard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fields: { key: string; value: string | null; href?: string | null }[] = [
    { key: 'jobTitle', value: card.jobTitle },
    { key: 'company', value: card.company },
    { key: 'phone', value: card.phone, href: card.phone ? `tel:${card.phone}` : null },
    { key: 'email', value: card.email, href: card.email ? `mailto:${card.email}` : null },
    { key: 'website', value: card.website, href: card.website },
    { key: 'address', value: card.address },
    { key: 'notes', value: card.notes },
  ];

  return (
    <article className="flex w-full max-w-3xl flex-col gap-4 px-8 py-6">
      <header className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-2xl font-semibold text-accent">
          {card.personPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.personPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            card.displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="truncate text-xl font-semibold text-fg">{card.displayName}</h2>
          {card.jobTitle || card.company ? (
            <p className="truncate text-[13px] text-fg-muted">
              {[card.jobTitle, card.company].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          data-testid="cards-detail-edit"
          onClick={onEdit}
          className="rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-bg-hover hover:text-fg"
        >
          {t('cards.editButton')}
        </button>
        <button
          type="button"
          data-testid="cards-detail-delete"
          onClick={onDelete}
          className="rounded-md border border-danger/30 px-3 py-1.5 text-[12px] font-medium text-danger hover:bg-danger/10"
        >
          {t('cards.deleteButton')}
        </button>
      </header>

      {card.cardImageUrl ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
            {t('cards.cardImageLabel')}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.cardImageUrl}
            alt=""
            className="max-h-[280px] rounded-lg border border-line object-contain"
          />
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {fields.map(({ key, value, href }) => {
          if (!value) return null;
          return (
            <div key={key} className={key === 'address' || key === 'notes' ? 'sm:col-span-2' : ''}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                {t(`cards.field.${key}`)}
              </dt>
              <dd className="mt-1 text-[13px] text-fg whitespace-pre-wrap break-words">
                {href ? (
                  <a href={href} className="text-accent hover:underline">{value}</a>
                ) : (
                  value
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </article>
  );
}
