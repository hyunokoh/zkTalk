'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CreateForumPostProps {
  channelId: string;
  onClose: () => void;
}

export function CreateForumPost({ channelId, onClose }: CreateForumPostProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const createPost = useMutation({
    mutationFn: () =>
      api(`/api/channels/${channelId}/threads`, {
        method: 'POST',
        body: { title, bodyMarkdown: body },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', channelId] });
      onClose();
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !body.trim()) return;
      createPost.mutate();
    },
    [title, body, createPost],
  );

  return (
    <div data-testid="forum-create-panel" className="border-b border-gray-800 bg-gray-850 px-4 py-4">
      <form data-testid="forum-create-form" onSubmit={handleSubmit} className="space-y-3">
        <input
          data-testid="forum-create-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          autoFocus
        />
        <textarea
          data-testid="forum-create-body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your post content... (Markdown supported)"
          rows={4}
          className="w-full resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />

        {createPost.isError && (
          <p className="text-sm text-red-400">
            {(createPost.error as Error).message || 'Failed to create post'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            data-testid="forum-create-cancel-button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="forum-create-submit-button"
            disabled={!title.trim() || !body.trim() || createPost.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createPost.isPending ? 'Posting...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
