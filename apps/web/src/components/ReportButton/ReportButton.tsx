'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

interface ReportButtonProps {
  communityId: string;
  messageId?: string;
  reportedUserId?: string;
}

const REASON_CODES = [
  { code: 'spam', label: 'Spam' },
  { code: 'harassment', label: 'Harassment' },
  { code: 'hate_speech', label: 'Hate Speech' },
  { code: 'misinformation', label: 'Misinformation' },
  { code: 'nsfw', label: 'NSFW Content' },
  { code: 'other', label: 'Other' },
];

export function ReportButton({
  communityId,
  messageId,
  reportedUserId,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  const submitReport = useMutation({
    mutationFn: () =>
      api(`/api/reports`, {
        method: 'POST',
        body: {
          communityId,
          ...(messageId ? { messageId } : {}),
          ...(reportedUserId ? { reportedUserId } : {}),
          reasonCode: selectedReason,
          ...(reasonText.trim() ? { reasonText: reasonText.trim() } : {}),
        },
      }),
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setSelectedReason('');
        setReasonText('');
      }, 1500);
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="message-report-button"
        className="flex items-center gap-1.5 text-xs text-fg-muted transition-colors hover:text-danger"
        title="Report"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
        Report
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-subtle p-4"
          data-testid="report-modal"
        >
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-xl border border-line bg-bg-subtle p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="report-modal-panel"
          >
            {submitted ? (
              <div className="text-center" data-testid="report-success-state">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/50">
                  <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="mt-3 font-medium text-fg-muted">{t('report.submitted')}</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {t('report.reviewMessage')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Report Content</h3>
                  <button
                    onClick={() => setOpen(false)}
                    data-testid="report-close-button"
                    className="text-fg-muted hover:text-fg"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="mt-2 text-sm text-fg-muted">
                  Select a reason for reporting this content.
                </p>

                <div className="mt-4 space-y-2">
                  {REASON_CODES.map((r) => (
                    <label
                      key={r.code}
                      data-testid="report-reason-option"
                      data-reason-code={r.code}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        selectedReason === r.code
                          ? 'border-accent bg-accent/10 text-fg-muted'
                          : 'border-line bg-bg-subtle/50 text-fg-muted hover:border-line'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.code}
                        checked={selectedReason === r.code}
                        onChange={() => setSelectedReason(r.code)}
                        data-testid={`report-reason-input-${r.code}`}
                        className="sr-only"
                      />
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          selectedReason === r.code
                            ? 'border-accent'
                            : 'border-line'
                        }`}
                      >
                        {selectedReason === r.code && (
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        )}
                      </div>
                      {r.label}
                    </label>
                  ))}
                </div>

                {selectedReason === 'other' && (
                  <textarea
                    value={reasonText}
                    onChange={(e) => setReasonText(e.target.value)}
                    placeholder="Please describe the issue..."
                    rows={3}
                    data-testid="report-reason-text-input"
                    className="mt-3 w-full rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder:text-fg focus:border-accent focus:outline-none"
                  />
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    data-testid="report-cancel-button"
                    className="rounded-lg px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => submitReport.mutate()}
                    disabled={!selectedReason || submitReport.isPending}
                    data-testid="report-submit-button"
                    className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/85 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitReport.isPending ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>

                {submitReport.isError && (
                  <p className="mt-2 text-center text-xs text-danger" data-testid="report-error-message">
                    Failed to submit report. Please try again.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
