'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Channel } from '@zktalk/shared';

interface CreateChannelModalProps {
  communityId: string;
  categoryId: string | null;
  onClose: () => void;
}

export function CreateChannelModal({ communityId, categoryId, onClose }: CreateChannelModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState<'chat' | 'announcement' | 'forum' | 'voice'>('chat');
  const [description, setDescription] = useState('');

  const createChannel = useMutation({
    mutationFn: () =>
      api<Channel>(`/api/communities/${communityId}/channels`, {
        method: 'POST',
        body: {
          name: name.toLowerCase().replace(/\s+/g, '-'),
          type,
          description: description || null,
          categoryId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', communityId] });
      onClose();
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      createChannel.mutate();
    },
    [name, createChannel],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-subtle" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-bg-subtle p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-fg-muted">Create Channel</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-muted">Channel Type</label>
            <div className="flex gap-2">
              {([
                { value: 'chat', label: '# Chat' },
                { value: 'announcement', label: 'Announcement' },
                { value: 'forum', label: 'Forum' },
                { value: 'voice', label: 'Voice' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === opt.value
                      ? 'bg-accent text-white'
                      : 'bg-bg-subtle text-fg-muted hover:bg-bg-subtle'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel name */}
          <div>
            <label htmlFor="channel-name" className="mb-1.5 block text-sm font-medium text-fg-muted">
              Name
            </label>
            <input
              id="channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="new-channel"
              className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="channel-desc" className="mb-1.5 block text-sm font-medium text-fg-muted">
              Description <span className="text-fg-muted">(optional)</span>
            </label>
            <textarea
              id="channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
              className="w-full resize-none rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-fg-muted placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Error */}
          {createChannel.isError && (
            <p className="text-sm text-danger">
              {(createChannel.error as Error).message || 'Failed to create channel'}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createChannel.isPending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createChannel.isPending ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
