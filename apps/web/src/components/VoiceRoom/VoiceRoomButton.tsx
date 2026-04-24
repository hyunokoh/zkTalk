'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { setLastVoiceChannelForCommunity } from '@/lib/voice-preferences';
import { useVoiceStore, type VoiceParticipant } from '@/stores/voice';
import { subscribe } from '@/hooks/useWebSocket';
import { WebSocketEvent } from '@zktalk/shared';

interface VoiceRoomButtonProps {
  channelId: string;
  communityId?: string;
  autoJoinMode?: 'voice' | 'video' | null;
  compact?: boolean;
}

interface JoinResponse {
  token: string;
  roomName: string;
  participants: VoiceParticipant[];
}

export function VoiceRoomButton({
  channelId,
  communityId,
  autoJoinMode = null,
  compact = false,
}: VoiceRoomButtonProps) {
  const { t } = useTranslation();
  const {
    isConnected,
    channelId: activeChannelId,
    disconnect,
    setParticipants,
    addParticipant,
    removeParticipant,
  } = useVoiceStore();
  const isScreenSharing = useVoiceStore((s) => s.isScreenSharing);
  const activeParticipants = useVoiceStore((s) => s.participants);
  const isActive = isConnected && activeChannelId === channelId;
  const didAutoJoinRef = useRef(false);

  // Query participants to show badge
  const { data: participantsData } = useQuery({
    queryKey: ['voice-participants', channelId],
    queryFn: () =>
      api<{ participants: VoiceParticipant[] }>(
        `/api/channels/${channelId}/voice/participants`,
      ),
    refetchInterval: isActive ? 2000 : 15000,
    enabled: true,
  });

  const participants = isActive
    ? activeParticipants
    : participantsData?.participants ?? [];
  const countBadgeClass = compact
    ? 'rounded-full bg-success px-1.5 py-0.5 text-[10px] font-medium text-white'
    : 'rounded-full bg-success px-2 py-1 text-xs font-medium text-white';
  const activeLeaveClass = compact
    ? 'rounded-full bg-danger px-2 py-1 text-[11px] font-semibold text-white hover:bg-danger disabled:opacity-50'
    : 'rounded-full bg-danger px-3 py-2 text-xs font-semibold text-white hover:bg-danger disabled:opacity-50';
  const joinButtonClass = compact
    ? 'inline-flex items-center gap-1 rounded-md border border-line bg-bg-hover px-2 py-1 text-[11px] font-semibold text-fg hover:bg-bg-hover disabled:opacity-50'
    : 'inline-flex items-center gap-1 rounded-full border border-line bg-bg-hover px-3 py-1.5 text-xs font-semibold text-fg hover:bg-bg-hover disabled:opacity-50';

  useEffect(() => {
    if (!isActive || !participantsData?.participants) return;
    setParticipants(participantsData.participants);
  }, [isActive, participantsData?.participants, setParticipants]);

  const joinMutation = useMutation<JoinResponse, Error, boolean>({
    mutationFn: () =>
      api<JoinResponse>(
        `/api/channels/${channelId}/voice/join`,
        { method: 'POST' },
      ),
    onSuccess: (data, video) => {
      if (communityId) {
        setLastVoiceChannelForCommunity(communityId, channelId);
      }
      useVoiceStore.getState().connect(channelId, data.token, video, data.participants);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () =>
      api<{ success: boolean }>(
        `/api/channels/${activeChannelId}/voice/leave`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      disconnect();
    },
  });

  const handleJoinVoice = useCallback(() => {
    joinMutation.mutate(false);
  }, [joinMutation]);

  const handleJoinVideo = useCallback(() => {
    joinMutation.mutate(true);
  }, [joinMutation]);

  const handleLeave = useCallback(() => {
    leaveMutation.mutate();
  }, [leaveMutation]);

  useEffect(() => {
    if (!autoJoinMode || didAutoJoinRef.current || isConnected || isActive || joinMutation.isPending) {
      return;
    }

    didAutoJoinRef.current = true;
    joinMutation.mutate(autoJoinMode === 'video');
  }, [autoJoinMode, isActive, isConnected, joinMutation]);

  useEffect(() => {
    if (!isActive) return;

    const unsubJoin = subscribe(WebSocketEvent.VOICE_USER_JOINED, (message) => {
      const data = message.data as
        | { channelId?: string; userId?: string; displayName?: string }
        | undefined;
      if (data?.channelId !== channelId) return;
      if (!data.userId || !data.displayName) return;

      addParticipant({
        userId: data.userId,
        displayName: data.displayName,
        joinedAt: new Date().toISOString(),
      });
    });

    const unsubLeave = subscribe(WebSocketEvent.VOICE_USER_LEFT, (message) => {
      const data = message.data as
        | { channelId?: string; userId?: string }
        | undefined;
      if (data?.channelId !== channelId) return;
      if (!data.userId) return;
      removeParticipant(data.userId);
    });

    return () => {
      unsubJoin();
      unsubLeave();
    };
  }, [addParticipant, channelId, isActive, removeParticipant]);

  if (isActive) {
    return (
      <div className="flex items-center gap-2">
        {participants.length > 0 && (
          <span className={countBadgeClass}>
            {t('voice.participantCount', { count: String(participants.length) })}
          </span>
        )}
        {isScreenSharing && (
          <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-medium text-white">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 8h4v2H8v-2z" />
            </svg>
            {t('voice.screenSharing')}
          </span>
        )}
        <button
          onClick={handleLeave}
          disabled={leaveMutation.isPending}
          data-testid="voice-room-leave-button"
          className={activeLeaveClass}
          title={t('voice.leave')}
        >
          {t('voice.leave')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {participants.length > 0 && (
        <span className={countBadgeClass}>
          {t('voice.participantCount', { count: String(participants.length) })}
        </span>
      )}
      <button
        onClick={handleJoinVoice}
        disabled={joinMutation.isPending || isConnected}
        data-testid="voice-room-join-button"
        className={joinButtonClass}
        title={t('voice.join')}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
        <span className={compact ? '' : 'hidden sm:inline'}>{t('voice.join')}</span>
      </button>
      <button
        onClick={handleJoinVideo}
        disabled={joinMutation.isPending || isConnected}
        data-testid="voice-room-join-video-button"
        className={joinButtonClass}
        title={t('voice.videoCall')}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
        <span className={compact ? '' : 'hidden sm:inline'}>{t('voice.videoCall')}</span>
      </button>
    </div>
  );
}
