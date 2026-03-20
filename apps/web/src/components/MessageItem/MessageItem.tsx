'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserAvatar } from '@/components/UserAvatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { relativeTime } from '@/lib/time';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useThreadStore } from '@/stores/thread';
import type { Message, User } from '@zktalk/shared';

interface MessageItemProps {
  message: Message;
  author?: User | null;
  channelId: string;
}

export function MessageItem({ message, author, channelId }: MessageItemProps) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const openThread = useThreadStore((s) => s.openThread);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.bodyMarkdown);
  const [showActions, setShowActions] = useState(false);

  const isAuthor = currentUser?.id === message.authorUserId;

  const editMutation = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channelId}/messages/${message.id}`, {
        method: 'PATCH',
        body: { bodyMarkdown: editBody },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channelId}/messages/${message.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const handleEditSubmit = useCallback(() => {
    if (!editBody.trim()) return;
    editMutation.mutate();
  }, [editBody, editMutation]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleEditSubmit();
      }
      if (e.key === 'Escape') {
        setIsEditing(false);
        setEditBody(message.bodyMarkdown);
      }
    },
    [handleEditSubmit, message.bodyMarkdown],
  );

  const handleReplyInThread = useCallback(() => {
    if (message.threadId) {
      openThread(message.threadId);
    }
    // If there's no thread yet, we'd need to create one.
    // For now, just use the message id as a thread indicator.
    openThread(message.id);
  }, [message, openThread]);

  if (message.isDeleted) {
    return (
      <div className="flex items-start gap-3 px-4 py-1">
        <div className="mt-0.5 h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm italic text-gray-500">[message deleted]</p>
        </div>
      </div>
    );
  }

  const displayName = author?.displayName ?? 'Unknown User';
  const avatarUrl = author?.avatarUrl ?? null;

  return (
    <div
      className="group relative flex items-start gap-3 px-4 py-1 hover:bg-gray-800/50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="mt-0.5">
        <UserAvatar displayName={displayName} avatarUrl={avatarUrl} size="sm" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-100">{displayName}</span>
          <span className="text-xs text-gray-500">{relativeTime(message.createdAt)}</span>
          {message.isEdited && <span className="text-xs text-gray-500">(edited)</span>}
        </div>

        {isEditing ? (
          <div className="mt-1">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full resize-none rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
              autoFocus
            />
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>
                Escape to{' '}
                <button onClick={() => { setIsEditing(false); setEditBody(message.bodyMarkdown); }} className="text-indigo-400 hover:underline">
                  cancel
                </button>
              </span>
              <span>&middot;</span>
              <span>
                Enter to{' '}
                <button onClick={handleEditSubmit} className="text-indigo-400 hover:underline">
                  save
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-300">
            <MarkdownRenderer content={message.bodyMarkdown} />
          </div>
        )}
      </div>

      {/* Hover action bar */}
      {showActions && !isEditing && (
        <div className="absolute -top-3 right-4 flex items-center gap-0.5 rounded-md border border-gray-700 bg-gray-800 p-0.5 shadow-lg">
          {/* Reply in thread */}
          <button
            onClick={handleReplyInThread}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            title="Reply in thread"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Edit (author only) */}
          {isAuthor && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              title="Edit message"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
          )}

          {/* Delete (author only) */}
          {isAuthor && (
            <button
              onClick={() => deleteMutation.mutate()}
              className="rounded p-1.5 text-gray-400 hover:bg-red-900/50 hover:text-red-400"
              title="Delete message"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
