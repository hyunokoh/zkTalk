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
    <div data-testid="forum-create-panel" className="border-b border-line bg-bg-subtle px-4 py-4">
      <form data-testid="forum-create-form" onSubmit={handleSubmit} className="space-y-3">
        <input
          data-testid="forum-create-title-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          autoFocus
        />
        <textarea
          data-testid="forum-create-body-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your post content... (Markdown supported)"
          rows={4}
          className="w-full resize-none rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {createPost.isError && (
          <p className="text-sm text-danger">
            {(createPost.error as Error).message || 'Failed to create post'}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            data-testid="forum-create-cancel-button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="forum-create-submit-button"
            disabled={!title.trim() || !body.trim() || createPost.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createPost.isPending ? 'Posting...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
