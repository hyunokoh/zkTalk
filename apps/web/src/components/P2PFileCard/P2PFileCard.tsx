'use client';

import { useState, useCallback, useEffect } from 'react';
import { getP2PManager } from '@/lib/p2p';
import { useTranslation } from '@/lib/i18n';
import { devLogError } from '@/lib/client-log';
import { useP2PSettingsStore } from '@/stores/p2p-settings';

interface P2PFileCardProps {
  fileId: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  channelId?: string;
  conversationId?: string;
}

type DownloadState = 'idle' | 'connecting' | 'downloading' | 'done' | 'error' | 'seeding';

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'archive';
  if (mimeType.includes('text') || mimeType.includes('document')) return 'document';
  return 'file';
}

function FileIcon({ type }: { type: string }) {
  const iconClasses = 'h-8 w-8 text-gray-400';

  switch (type) {
    case 'image':
      return (
        <svg className={iconClasses} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    case 'video':
      return (
        <svg className={iconClasses} viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    case 'audio':
      return (
        <svg className={iconClasses} viewBox="0 0 20 20" fill="currentColor">
          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClasses} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
  }
}

export function P2PFileCard({
  fileId,
  fileName,
  fileSize,
  mimeType,
  channelId,
  conversationId,
}: P2PFileCardProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState(0);
  const autoSeed = useP2PSettingsStore((s) => s.autoSeed);
  const canSeed = useP2PSettingsStore((s) => s.canSeed);

  // Check if we are seeding this file
  useEffect(() => {
    const manager = getP2PManager();
    if (manager.hasFile(fileId)) {
      setState('seeding');
    }
  }, [fileId]);

  const handleDownload = useCallback(async () => {
    setState('connecting');
    setProgress(0);

    const manager = getP2PManager();

    // Set up progress callback
    const prevOnProgress = manager.onProgress;
    manager.onProgress = (fId: string, pct: number) => {
      if (fId === fileId) {
        setState('downloading');
        setProgress(pct);
      }
      prevOnProgress?.(fId, pct);
    };

    try {
      const blob = await manager.requestFile(fileId, channelId, conversationId);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState('done');

      // Auto-seed if enabled
      if (autoSeed && canSeed()) {
        const file = new File([blob], fileName, { type: mimeType });
        await manager.seedFile(fileId, file);
        setState('seeding');
      }
    } catch (error) {
      devLogError('[P2P] Download failed:', error);
      setState('error');
    } finally {
      manager.onProgress = prevOnProgress;
    }
  }, [fileId, fileName, mimeType, channelId, conversationId, autoSeed, canSeed]);

  const iconType = getFileIcon(mimeType);

  return (
    <div className="my-1 inline-flex max-w-sm items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-3">
      <FileIcon type={iconType} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-200">{fileName}</p>
        <p className="text-xs text-gray-500">
          {fileSize} &middot; {t('p2p.noLimit')}
        </p>

        {/* Progress bar */}
        {(state === 'downloading' || state === 'connecting') && (
          <div className="mt-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {state === 'connecting'
                ? t('p2p.downloading')
                : t('p2p.progress', { percent: progress })}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0">
        {state === 'idle' && (
          <button
            onClick={handleDownload}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <svg className="inline-block h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}

        {state === 'connecting' && (
          <svg className="h-5 w-5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
          </svg>
        )}

        {state === 'downloading' && (
          <span className="text-xs font-medium text-indigo-400">{progress}%</span>
        )}

        {state === 'done' && (
          <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}

        {state === 'seeding' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-400">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            {t('p2p.seeding')}
          </span>
        )}

        {state === 'error' && (
          <button
            onClick={handleDownload}
            className="text-xs text-red-400 hover:text-red-300"
            title={t('p2p.noSeeders')}
          >
            {t('p2p.noSeeders')}
          </button>
        )}
      </div>
    </div>
  );
}
