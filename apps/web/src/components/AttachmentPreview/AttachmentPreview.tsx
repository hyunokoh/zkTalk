'use client';

import { useState } from 'react';
import type { Attachment } from '@zktalk/shared';

interface AttachmentPreviewProps {
  attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function FileIcon() {
  return (
    <svg
      className="h-8 w-8 text-gray-400"
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

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const [expanded, setExpanded] = useState(false);
  const src = attachment.storageKey;

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="group relative max-w-sm overflow-hidden rounded-lg border border-gray-700"
      >
        <img
          src={src}
          alt={attachment.fileName}
          className="max-h-60 w-auto object-cover transition-opacity group-hover:opacity-80"
          loading="lazy"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            Click to expand
          </span>
        </div>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 rounded-full bg-gray-800 p-2 text-gray-300 hover:bg-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={src}
            alt={attachment.fileName}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a
      href={attachment.storageKey}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 transition-colors hover:bg-gray-800"
    >
      <FileIcon />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-200">
          {attachment.fileName}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>
      <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    </a>
  );
}

export function AttachmentPreview({ attachments }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImage(a.mimeType));
  const files = attachments.filter((a) => !isImage(a.mimeType));

  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((attachment) => (
            <ImageAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((attachment) => (
            <FileAttachment key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}
    </div>
  );
}
