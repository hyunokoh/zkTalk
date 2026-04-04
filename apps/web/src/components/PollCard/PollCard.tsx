'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';

export interface PollCardOption {
  id: string;
  text: string;
  voteCount: number;
  voted: boolean;
}

export interface PollCardData {
  id: string;
  channelId: string;
  messageId: string | null;
  question: string;
  options: PollCardOption[];
  totalVotes: number;
  anonymous: boolean;
  multipleChoice: boolean;
  expiresAt: string | null;
  closed: boolean;
  createdAt: string;
}

interface PollCardProps {
  poll: PollCardData;
}

export function PollCard({ poll }: PollCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isExpired = poll.closed || (poll.expiresAt && new Date(poll.expiresAt) < new Date());

  const voteMutation = useMutation({
    mutationFn: ({ optionId, voted }: { optionId: string; voted: boolean }) =>
      voted
        ? api(`/api/polls/${poll.id}/vote/${optionId}`, {
            method: 'DELETE',
          })
        : api(`/api/polls/${poll.id}/vote`, {
            method: 'POST',
            body: { optionId },
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-polls-by-message', poll.channelId] });
    },
  });

  return (
    <div
      data-testid="poll-card"
      data-poll-id={poll.id}
      className="my-2 rounded-[1rem] border border-[#d7e2ea] bg-[#f4f8fb] p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-1 inline-flex rounded-full bg-[#eaf1f6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#607384]">
            Poll
          </div>
          <h4 className="text-sm font-semibold text-[#203040]">{poll.question}</h4>
        </div>
        {isExpired && (
          <span className="shrink-0 rounded-full border border-[#d7e2ea] bg-white px-2 py-0.5 text-xs font-semibold text-[#607384]">
            {t('poll.closed')}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const pct = poll.totalVotes > 0 ? Math.round((option.voteCount / poll.totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              data-testid="poll-option-button"
              data-option-id={option.id}
              data-voted={option.voted ? 'true' : 'false'}
              onClick={() => !isExpired && voteMutation.mutate({ optionId: option.id, voted: option.voted })}
              disabled={!!isExpired || voteMutation.isPending}
              className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                option.voted
                  ? 'border-[#ebd451] bg-[#fff8bf] text-[#6d5600]'
                  : 'border-[#d7e2ea] bg-white text-[#32485c] hover:border-[#c3d3de]'
              } ${isExpired ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  option.voted ? 'bg-[#fee500]/35' : 'bg-[#eaf1f6]'
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span>{option.text}</span>
                <span className="ml-2 text-xs font-medium text-[#607384]">
                  {pct}% ({option.voteCount})
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p
        data-testid="poll-total-votes"
        data-total-votes={String(poll.totalVotes)}
        className="mt-3 text-xs font-medium text-[#607384]"
      >
        {t('poll.totalVotes', { count: poll.totalVotes })}
      </p>
    </div>
  );
}
