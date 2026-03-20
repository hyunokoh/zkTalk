'use client';

import { useState, useRef, useCallback } from 'react';

interface PendingFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface FileUploadZoneProps {
  onFilesSelected: (files: PendingFile[]) => void;
  children: React.ReactNode;
}

let fileIdCounter = 0;

export function FileUploadZone({ onFilesSelected, children }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const processFiles = useCallback(
    (fileList: FileList) => {
      const pending: PendingFile[] = Array.from(fileList).map((file) => ({
        id: `file-${++fileIdCounter}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }));
      onFilesSelected(pending);
    },
    [onFilesSelected],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles],
  );

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-500 bg-indigo-500/10">
          <div className="text-center">
            <svg
              className="mx-auto h-10 w-10 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="mt-2 text-sm font-medium text-indigo-300">
              Drop files to upload
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Trigger file input externally */
export function FileUploadButton({
  inputRef,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
      title="Attach file"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
        />
      </svg>
    </button>
  );
}

/** Shows pending files in the composer area */
export function PendingFileList({
  files,
  onRemove,
}: {
  files: PendingFile[];
  onRemove: (id: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t border-gray-700 px-3 py-2">
      {files.map((pf) => (
        <div
          key={pf.id}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm"
        >
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <span className="max-w-[120px] truncate text-gray-300">{pf.file.name}</span>
          {pf.status === 'uploading' && (
            <div className="h-1 w-16 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${pf.progress}%` }}
              />
            </div>
          )}
          {pf.status === 'error' && (
            <span className="text-xs text-red-400">Failed</span>
          )}
          <button
            onClick={() => onRemove(pf.id)}
            className="text-gray-500 hover:text-gray-300"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
