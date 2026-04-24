'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { ReactionPicker } from '@/components/ReactionPicker';

interface ReactionGroup {
  emoji: string;
  count: number;
  userIds: string[];
}

interface ReactionBarProps {
  messageId: string;
  reactions: ReactionGroup[];
  channelId: string;
}

export function ReactionBar({ messageId, reactions, channelId }: ReactionBarProps) {
  const [showPicker, setShowPicker] = useState(false);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const toggleReaction = useMutation({
    mutationFn: ({ emoji, remove }: { emoji: string; remove: boolean }) =>
      remove
        ? api(`/api/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
            method: 'DELETE',
          })
        : api(`/api/messages/${messageId}/reactions`, {
            method: 'POST',
            body: { emoji },
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] });
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const handleToggle = (emoji: string) => {
    const hasReacted = !!user && reactions.some(
      (reaction) => reaction.emoji === emoji && reaction.userIds.includes(user.id),
    );
    toggleReaction.mutate({ emoji, remove: hasReacted });
  };

  const handlePickerSelect = (emoji: string) => {
    setShowPicker(false);
    handleToggle(emoji);
  };

  if (reactions.length === 0 && !showPicker) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => {
        const hasReacted = user ? reaction.userIds.includes(user.id) : false;
        return (
          <button
            key={reaction.emoji}
            onClick={() => handleToggle(reaction.emoji)}
            disabled={toggleReaction.isPending}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              hasReacted
                ? 'border-accent/50 bg-accent/20 text-accent'
                : 'border-line bg-bg-subtle text-fg-muted hover:border-line hover:bg-bg-hover'
            }`}
          >
            <span>{reaction.emoji}</span>
            {reaction.count >= 2 ? <span>{reaction.count}</span> : null}
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setShowPicker((prev) => !prev)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg-subtle text-xs text-fg-muted transition-colors hover:border-line hover:bg-bg-hover hover:text-fg"
          title="Add reaction"
        >
          +
        </button>
        {showPicker && (
          <ReactionPicker
            onSelect={handlePickerSelect}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
