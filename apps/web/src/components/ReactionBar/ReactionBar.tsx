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
    mutationFn: (emoji: string) =>
      api(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        body: { emoji },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const handleToggle = (emoji: string) => {
    toggleReaction.mutate(emoji);
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
                ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:bg-gray-700'
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.count}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setShowPicker((prev) => !prev)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-xs text-gray-500 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-gray-300"
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
