'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface MessageComposerProps {
  channelId: string;
  threadId?: string | null;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageComposer({
  channelId,
  threadId,
  placeholder = 'Type a message...',
  disabled = false,
}: MessageComposerProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const basePath = threadId
    ? `/api/channels/${channelId}/threads/${threadId}/messages`
    : `/api/channels/${channelId}/messages`;

  const sendMessage = useMutation({
    mutationFn: (bodyMarkdown: string) =>
      api(basePath, {
        method: 'POST',
        body: { bodyMarkdown },
        headers: {
          'X-Request-Id': generateRequestId(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId, threadId ?? 'main'] });
      setBody('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [body]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (body.trim() && !sendMessage.isPending) {
          sendMessage.mutate(body.trim());
        }
      }
    },
    [body, sendMessage],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (body.trim() && !sendMessage.isPending) {
        sendMessage.mutate(body.trim());
      }
    },
    [body, sendMessage],
  );

  return (
    <div className="border-t border-gray-800 px-4 py-3">
      {/* Context indicator */}
      {threadId && (
        <div className="mb-2 text-xs text-gray-500">
          Replying in thread
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 rounded-lg bg-gray-800 border border-gray-700 focus-within:border-indigo-500">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!body.trim() || sendMessage.isPending || disabled}
          className="shrink-0 rounded-lg bg-indigo-600 p-2.5 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>

      {/* Typing indicator placeholder */}
      <div className="mt-1 h-4 text-xs text-gray-500" />
    </div>
  );
}
