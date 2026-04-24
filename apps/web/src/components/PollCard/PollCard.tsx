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
      className="my-2 rounded-[1rem] border border-line bg-bg-subtle p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-1 inline-flex rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-muted">
            Poll
          </div>
          <h4 className="text-sm font-semibold text-fg">{poll.question}</h4>
        </div>
        {isExpired && (
          <span className="shrink-0 rounded-full border border-line bg-white px-2 py-0.5 text-xs font-semibold text-fg-muted">
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
                  ? 'border-warning bg-warning-soft text-warning'
                  : 'border-line bg-white text-fg hover:border-line'
              } ${isExpired ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  option.voted ? 'bg-warning/35' : 'bg-bg-subtle'
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span>{option.text}</span>
                <span className="ml-2 text-xs font-medium text-fg-muted">
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
        className="mt-3 text-xs font-medium text-fg-muted"
      >
        {t('poll.totalVotes', { count: poll.totalVotes })}
      </p>
    </div>
  );
}
