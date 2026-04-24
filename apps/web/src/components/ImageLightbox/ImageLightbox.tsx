/* eslint-disable @next/next/no-img-element */

'use client';

import { useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
  onSave?: () => void;
  images?: string[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function ImageLightbox({
  src,
  alt,
  onClose,
  onSave,
  images,
  currentIndex = 0,
  onNavigate,
}: ImageLightboxProps) {
  const { t } = useTranslation();
  const hasMultiple = images && images.length > 1;

  const handlePrev = useCallback(() => {
    if (!images || !onNavigate) return;
    const prev = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onNavigate(prev);
  }, [images, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (!images || !onNavigate) return;
    const next = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onNavigate(next);
  }, [images, currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, handlePrev, handleNext, hasMultiple]);

  const displaySrc = images ? images[currentIndex] ?? src : src;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/84 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        {onSave ? (
          <button
            type="button"
            data-testid="image-lightbox-save-button"
            onClick={(event) => {
              event.stopPropagation();
              onSave();
            }}
            className="rounded-full border border-slate-200/80 bg-bg-hover px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg transition-colors hover:bg-white hover:text-slate-900"
            title={t('attachment.save')}
          >
            {t('attachment.save')}
          </button>
        ) : null}
        <button
          onClick={onClose}
          className="rounded-full border border-slate-200/80 bg-bg-hover p-2 text-slate-600 shadow-lg transition-colors hover:bg-white hover:text-slate-900"
          title={t('lightbox.close')}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200/80 bg-bg-hover p-2 text-slate-600 shadow-lg transition-colors hover:bg-white hover:text-slate-900"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      <div
        className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-[28px] border border-line0 bg-bg-hover p-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={displaySrc}
          alt={alt ?? ''}
          loading="eager"
          draggable={false}
          className="max-h-[calc(90vh-1rem)] max-w-[calc(90vw-1rem)] rounded-[22px] object-contain"
        />
      </div>

      {hasMultiple && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-slate-200/80 bg-bg-hover p-2 text-slate-600 shadow-lg transition-colors hover:bg-white hover:text-slate-900"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-200/80 bg-bg-hover px-3 py-1 text-sm font-semibold text-slate-700 shadow-lg">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
