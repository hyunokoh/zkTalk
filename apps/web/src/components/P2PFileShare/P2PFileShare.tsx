'use client';

import { useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { resolveFileMimeType } from '@/lib/file-mime';
import { computeFileHash, getP2PManager, formatFileSize } from '@/lib/p2p';
import { useTranslation } from '@/lib/i18n';
import { devLogError } from '@/lib/client-log';
import { useP2PSettingsStore } from '@/stores/p2p-settings';
import { useToastStore } from '@/stores/toast';

const CHUNK_SIZE = 64 * 1024; // 64KB

interface P2PFileShareProps {
  channelId: string;
  threadId?: string | null;
  replyToMessageId?: string | null;
  topic?: string;
  requireTopic?: boolean;
  conversationId?: string;
  onFileSent?: (fileId: string, fileName: string) => void;
}

interface P2pFileResponse {
  file: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileHash: string;
    chunkCount: number;
  };
}

export function P2PFileShare({
  channelId,
  threadId,
  replyToMessageId,
  topic,
  requireTopic = false,
  conversationId,
  onFileSent,
}: P2PFileShareProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const canSeed = useP2PSettingsStore((s) => s.canSeed);

  const registerFile = useMutation({
    mutationFn: async (data: {
      channelId?: string;
      conversationId?: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      fileHash: string;
      chunkCount: number;
    }) => {
      return api<P2pFileResponse>('/api/p2p/files', {
        method: 'POST',
        body: data,
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (body: { bodyMarkdown: string }) => {
      const basePath = threadId
        ? `/api/channels/${channelId}/threads/${threadId}/messages`
        : `/api/channels/${channelId}/messages`;

      return api(basePath, {
        method: 'POST',
        body: threadId
          ? body
          : {
              ...body,
              ...(replyToMessageId ? { parentMessageId: replyToMessageId } : {}),
              ...(topic?.trim() ? { topic: topic.trim() } : {}),
            },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', channelId, threadId ?? 'main'],
      });
    },
  });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      setIsProcessing(true);

      try {
        const mimeType = resolveFileMimeType(file);
        // Compute SHA-256 hash
        const fileHash = await computeFileHash(file);
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);

        // Register file metadata on server
        const result = await registerFile.mutateAsync({
          channelId,
          conversationId,
          fileName: file.name,
          fileSize: file.size,
          mimeType,
          fileHash,
          chunkCount,
        });

        const fileId = result.file.id;

        // Start seeding the file
        const manager = getP2PManager();
        await manager.seedFile(fileId, file);

        // Send a message with the P2P file reference
        const sizeStr = formatFileSize(file.size);
        await sendMessage.mutateAsync({
          bodyMarkdown: `[p2p-file:${fileId}|${file.name}|${sizeStr}|${mimeType}]`,
        });

        onFileSent?.(fileId, file.name);
      } catch (error) {
        devLogError('[P2P] Failed to share file:', error);
      } finally {
        setIsProcessing(false);
        setSelectedFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [channelId, conversationId, registerFile, sendMessage, onFileSent],
  );

  const handleClick = useCallback(() => {
    if (!canSeed()) {
      showToast({ tone: 'info', message: t('p2p.wifiOnly') });
      return;
    }
    if (requireTopic && !topic?.trim()) {
      return;
    }
    fileInputRef.current?.click();
  }, [canSeed, requireTopic, showToast, t, topic]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing || (requireTopic && !topic?.trim())}
        className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg-muted disabled:opacity-50"
        title={t('p2p.shareFile')}
      >
        {isProcessing ? (
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              fill="currentColor"
              className="opacity-75"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      {selectedFile && isProcessing && (
        <span className="text-xs text-fg-muted">
          {t('p2p.downloading')} {selectedFile.name}
        </span>
      )}
    </>
  );
}
