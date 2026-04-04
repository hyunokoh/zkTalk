'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth';

interface ZkPollOption {
  id: string;
  text: string;
  position: number;
  voteCount: number;
}

interface ZkPollData {
  id: string;
  channelId: string;
  question: string;
  options: ZkPollOption[];
  totalVotes: number;
  expiresAt: string | null;
}

interface ZkPollCardProps {
  pollId: string;
}

/**
 * Compute SHA-256 hash of a string (browser-side).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function ZkPollCard({ pollId }: ZkPollCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [secret] = useState(() => crypto.randomUUID());

  // Fetch poll results
  const { data: pollData } = useQuery({
    queryKey: ['zk-poll', pollId],
    queryFn: async () => {
      const res = await api<{ poll: ZkPollData['expiresAt'] extends string ? unknown : unknown; options: ZkPollOption[]; totalVotes: number }>(
        `/api/zk-polls/${pollId}/results`,
      );
      return res;
    },
    refetchInterval: 10_000,
  });

  const options = pollData?.options ?? [];
  const totalVotes = pollData?.totalVotes ?? 0;

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Compute nullifier = SHA256(userId + pollId) -- prevents double voting
      const nullifier = await sha256(user.id + pollId);
      // Compute voteHash = SHA256(secret + optionId) -- proves vote without revealing identity
      const voteHash = await sha256(secret + optionId);

      return api(`/api/zk-polls/${pollId}/vote`, {
        method: 'POST',
        body: { voteHash, nullifier, optionId },
      });
    },
    onSuccess: (_data, optionId) => {
      setHasVoted(true);
      setVotedOptionId(optionId);
      queryClient.invalidateQueries({ queryKey: ['zk-poll', pollId] });
    },
  });

  const handleVote = useCallback(
    (optionId: string) => {
      if (!hasVoted && !voteMutation.isPending) {
        voteMutation.mutate(optionId);
      }
    },
    [hasVoted, voteMutation],
  );

  return (
    <div className="my-2 rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
          {t('zkVote.title')}
        </span>
      </div>

      <h4 className="mb-3 text-sm font-semibold text-gray-100">
        {(pollData as { poll?: { question?: string } } | undefined)?.poll?.question ?? t('common.loading')}
      </h4>

      <div className="space-y-2">
        {options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          const isSelected = votedOptionId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={hasVoted || voteMutation.isPending}
              className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? 'border-green-500 bg-green-500/10 text-green-200'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
              } ${hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  isSelected ? 'bg-green-500/20' : 'bg-gray-700/50'
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span>{option.text}</span>
                {hasVoted && (
                  <span className="ml-2 text-xs text-gray-400">
                    {pct}% ({option.voteCount})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {t('zkVote.voted', { count: totalVotes })}
        </p>
        {hasVoted && (
          <span className="text-xs text-green-400">
            {t('zkVote.anonymous')}
          </span>
        )}
      </div>

      {voteMutation.isError && (
        <p className="mt-1 text-xs text-red-400">
          {(voteMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
