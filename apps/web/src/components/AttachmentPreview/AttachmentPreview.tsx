/* eslint-disable @next/next/no-img-element */

'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isImageAttachmentMimeType, type Attachment } from '@zktalk/shared';
import { getAttachmentActionErrorMessage } from '@/lib/error-copy';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { assertOkResponse, createAuthHeaders } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { ImageLightbox } from '@/components/ImageLightbox';
import { useToastStore } from '@/stores/toast';

interface AttachmentPreviewProps {
  attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(attachment: Attachment): boolean {
  return isImageAttachmentMimeType(attachment.mimeType, attachment.fileName);
}

function getAttachmentUrl(attachment: Attachment): string {
  return `${getApiBaseUrl()}/api/upload/attachments/${attachment.id}/file`;
}

async function fetchAttachmentBlobUrl(
  attachment: Attachment,
): Promise<string> {
  const url = getAttachmentUrl(attachment);
  const res = await fetch(url, {
    credentials: 'include',
    headers: createAuthHeaders(url),
  });
  await assertOkResponse(res, `Attachment fetch failed with status ${res.status}`);

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function fetchAttachmentBytes(
  attachment: Attachment,
): Promise<Uint8Array> {
  const url = getAttachmentUrl(attachment);
  const res = await fetch(url, {
    credentials: 'include',
    headers: createAuthHeaders(url),
  });
  await assertOkResponse(res, `Attachment fetch failed with status ${res.status}`);

  return new Uint8Array(await res.arrayBuffer());
}

function getAttachmentKindLabel(attachment: Attachment): string {
  const extension = attachment.fileName.split('.').pop()?.trim();
  if (extension) {
    return extension.toUpperCase().slice(0, 6);
  }

  if (attachment.mimeType.includes('pdf')) return 'PDF';
  if (attachment.mimeType.includes('sheet') || attachment.mimeType.includes('excel')) return 'XLS';
  if (attachment.mimeType.includes('word') || attachment.mimeType.includes('document')) return 'DOC';
  if (attachment.mimeType.includes('zip') || attachment.mimeType.includes('compressed')) return 'ZIP';
  if (attachment.mimeType.includes('audio')) return 'AUDIO';
  if (attachment.mimeType.includes('video')) return 'VIDEO';
  return 'FILE';
}

function getImageGridClassName(count: number): string {
  if (count <= 1) {
    return 'flex';
  }

  return 'grid max-w-[22.5rem] grid-cols-2 gap-2';
}

function getImageCardClassName(count: number, index: number): string {
  const base =
    'group relative overflow-hidden rounded-[1rem] border border-line bg-bg-subtle';

  if (count <= 1) {
    return `${base} aspect-[4/3] min-h-[12rem] w-full max-w-sm`;
  }

  if (count === 3 && index === 0) {
    return `${base} col-span-2 aspect-[2.1/1] w-full`;
  }

  return `${base} aspect-square w-full`;
}

function FileIcon() {
  return (
    <svg
      className="h-8 w-8 text-fg-muted"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function ImageAttachment({
  attachment,
  src,
  previewFailed,
  onOpen,
  onSave,
  saveLabel,
  previewUnavailableLabel,
  className,
  extraCount,
}: {
  attachment: Attachment;
  src: string | null;
  previewFailed: boolean;
  onOpen: () => void;
  onSave: () => void;
  saveLabel: string;
  previewUnavailableLabel: string;
  className: string;
  extraCount?: number;
}) {
  return (
    <div
      className={`${className} ${src || previewFailed ? '' : 'animate-pulse'}`}
    >
      <button
        type="button"
        data-testid="attachment-image-button"
        data-attachment-id={attachment.id}
        data-attachment-ready={src ? 'true' : 'false'}
        onClick={onOpen}
        className="absolute inset-0"
      >
        <span className="sr-only">{attachment.fileName}</span>
      </button>
      {src ? (
        <img
          data-testid="attachment-image"
          src={src}
          alt={attachment.fileName}
          loading="lazy"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg-subtle px-4 text-center text-xs font-semibold text-fg-muted">
          {previewFailed ? previewUnavailableLabel : 'Loading preview...'}
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-full bg-bg-elevated/75 px-3 py-1 text-xs font-semibold text-white">
          Open preview
        </span>
      </div>
      {extraCount && extraCount > 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg-elevated/45">
          <span className="text-xl font-bold text-white">{`+${extraCount}`}</span>
        </div>
      ) : null}
      <button
        type="button"
        data-testid="attachment-image-save-button"
        onClick={(event) => {
          event.stopPropagation();
          onSave();
        }}
        className="absolute right-3 top-3 rounded-full border border-line bg-bg-elevated/75 px-3 py-1 text-xs font-semibold text-white opacity-0 transition-opacity hover:bg-bg-elevated group-hover:opacity-100"
      >
        {saveLabel}
      </button>
    </div>
  );
}

function FileAttachment({
  attachment,
  onOpen,
  onSave,
  openLabel,
  saveLabel,
}: {
  attachment: Attachment;
  onOpen: () => void;
  onSave: () => void;
  openLabel: string;
  saveLabel: string;
}) {
  const kindLabel = getAttachmentKindLabel(attachment);

  return (
    <div className="flex items-center gap-3 rounded-[1rem] border border-line bg-bg-subtle px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-bg-hover">
          <FileIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-bold tracking-wide text-fg-muted">
              {kindLabel}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-fg">
            {attachment.fileName}
          </p>
          <p className="mt-1 text-xs font-medium text-fg-muted">
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          data-testid="attachment-file-save-button"
          data-attachment-id={attachment.id}
          type="button"
          onClick={onSave}
          className="rounded-full border border-line bg-bg-hover px-3 py-1 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover"
        >
          {saveLabel}
        </button>
        <button
          data-testid="attachment-file-button"
          data-attachment-id={attachment.id}
          type="button"
          onClick={onOpen}
          className="rounded-full border border-line bg-bg-hover px-3 py-1 text-xs font-semibold text-fg transition-colors hover:bg-bg-hover"
        >
          {openLabel}
        </button>
      </div>
    </div>
  );
}

export function AttachmentPreview({ attachments }: AttachmentPreviewProps) {
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [resolvedImageUrls, setResolvedImageUrls] = useState<Record<string, string>>({});
  const [failedImageIds, setFailedImageIds] = useState<Record<string, true>>({});
  const createdBlobUrlsRef = useRef<Set<string>>(new Set());
  const images = useMemo(
    () => attachments.filter((attachment) => isImageAttachment(attachment)),
    [attachments],
  );
  const files = useMemo(
    () => attachments.filter((attachment) => !isImageAttachment(attachment)),
    [attachments],
  );
  const visibleImages = useMemo(() => images.slice(0, 4), [images]);
  const imageUrls = useMemo(
    () => images.map((attachment) => resolvedImageUrls[attachment.id] ?? ''),
    [images, resolvedImageUrls],
  );
  const selectedImage = selectedImageIndex != null ? images[selectedImageIndex] : null;

  const ensureImageUrl = useCallback(async (attachment: Attachment): Promise<string> => {
    const existingUrl = resolvedImageUrls[attachment.id];
    if (existingUrl) {
      return existingUrl;
    }

    const blobUrl = await fetchAttachmentBlobUrl(attachment);
    createdBlobUrlsRef.current.add(blobUrl);
    setResolvedImageUrls((prev) => {
      if (prev[attachment.id] === blobUrl) {
        return prev;
      }

      return {
        ...prev,
        [attachment.id]: blobUrl,
      };
    });
    setFailedImageIds((prev) => {
      if (!prev[attachment.id]) {
        return prev;
      }

      const next = { ...prev };
      delete next[attachment.id];
      return next;
    });
    return blobUrl;
  }, [resolvedImageUrls]);

  useEffect(() => {
    let cancelled = false;
    const createdUrls: string[] = [];

    async function loadImages() {
      const entries = await Promise.all(
        images.map(async (attachment) => {
          try {
            const blobUrl = await fetchAttachmentBlobUrl(attachment);
            createdUrls.push(blobUrl);
            createdBlobUrlsRef.current.add(blobUrl);
            return [attachment.id, blobUrl] as const;
          } catch {
            return [attachment.id, ''] as const;
          }
        }),
      );

      if (cancelled) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      setResolvedImageUrls((prev) => {
        const next: Record<string, string> = {};
        for (const attachment of images) {
          if (prev[attachment.id]) {
            next[attachment.id] = prev[attachment.id];
          }
        }
        for (const [id, url] of entries) {
          if (url) {
            next[id] = url;
          }
        }
        return next;
      });
      setFailedImageIds(() => {
        const next: Record<string, true> = {};
        for (const [id, url] of entries) {
          if (!url) {
            next[id] = true;
          }
        }
        return next;
      });
    }

    void loadImages();

    return () => {
      cancelled = true;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  useEffect(() => {
    const createdBlobUrls = createdBlobUrlsRef.current;
    return () => {
      createdBlobUrls.forEach((url) => URL.revokeObjectURL(url));
      createdBlobUrls.clear();
    };
  }, []);

  const handleOpenFile = async (attachment: Attachment) => {
    if (typeof window !== 'undefined' && typeof window.zkTalkDesktop?.openFile === 'function') {
      try {
        const bytes = await fetchAttachmentBytes(attachment);
        await window.zkTalkDesktop.openFile({
          name: attachment.fileName,
          type: attachment.mimeType,
          bytes,
        });
        return;
      } catch {
        // Fall back to browser-based open below.
      }
    }

    try {
      const blobUrl = await fetchAttachmentBlobUrl(attachment);
      const opened = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = attachment.fileName;
        link.rel = 'noopener noreferrer';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      showToast({
        tone: 'error',
        message: getAttachmentActionErrorMessage(t, error),
      });
    }
  };

  const handleSaveAttachment = useCallback(async (attachment: Attachment) => {
    if (typeof window !== 'undefined' && typeof window.zkTalkDesktop?.saveFile === 'function') {
      try {
        const bytes = await fetchAttachmentBytes(attachment);
        const result = await window.zkTalkDesktop.saveFile({
          name: attachment.fileName,
          type: attachment.mimeType,
          bytes,
        });
        if (result?.path || result?.canceled) {
          return;
        }
      } catch {
        // Fall back to browser-based download below.
      }
    }

    try {
      const blobUrl = await fetchAttachmentBlobUrl(attachment);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      showToast({
        tone: 'error',
        message: getAttachmentActionErrorMessage(t, error),
      });
    }
  }, [showToast, t]);

  const handleOpenImage = useCallback(async (attachment: Attachment, index: number) => {
    try {
      await ensureImageUrl(attachment);
    } catch (error) {
      showToast({
        tone: 'error',
        message: getAttachmentActionErrorMessage(t, error),
      });
      return;
    }

    setSelectedImageIndex(index);
  }, [ensureImageUrl, showToast, t]);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className={getImageGridClassName(visibleImages.length)}>
          {visibleImages.map((attachment, index) => (
            <ImageAttachment
              key={attachment.id}
              attachment={attachment}
              src={resolvedImageUrls[attachment.id] ?? null}
              previewFailed={Boolean(failedImageIds[attachment.id])}
              onOpen={() => {
                if (failedImageIds[attachment.id]) {
                  void handleOpenFile(attachment);
                  return;
                }
                void handleOpenImage(attachment, index);
              }}
              onSave={() => {
                void handleSaveAttachment(attachment);
              }}
              saveLabel={t('attachment.save')}
              previewUnavailableLabel={t('attachment.unavailable')}
              className={getImageCardClassName(visibleImages.length, index)}
              extraCount={images.length > 4 && index === 3 ? images.length - 4 : undefined}
            />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((attachment) => (
            <FileAttachment
              key={attachment.id}
              attachment={attachment}
              onOpen={() => {
                void handleOpenFile(attachment);
              }}
              onSave={() => {
                void handleSaveAttachment(attachment);
              }}
              openLabel={t('attachment.open')}
              saveLabel={t('attachment.save')}
            />
          ))}
        </div>
      )}
      </div>
      {visibleImages.some((attachment) => failedImageIds[attachment.id]) ? (
        <p className="text-xs font-medium text-fg-muted">
          {t('attachment.previewUnavailable')}
        </p>
      ) : null}
      {selectedImage && selectedImageIndex != null ? (
        <ImageLightbox
          src={imageUrls[selectedImageIndex] ?? getAttachmentUrl(selectedImage)}
          alt={selectedImage.fileName}
          images={imageUrls}
          currentIndex={selectedImageIndex}
          onNavigate={setSelectedImageIndex}
          onSave={() => {
            void handleSaveAttachment(selectedImage);
          }}
          onClose={() => setSelectedImageIndex(null)}
        />
      ) : null}
    </>
  );
}
