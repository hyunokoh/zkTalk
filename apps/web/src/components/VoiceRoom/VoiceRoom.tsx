'use client';

import { useCallback, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
  TrackToggle,
  DisconnectButton,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { useTranslation } from '@/lib/i18n';
import { api } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/runtime-config';
import { getSessionToken } from '@/lib/session-token';
import { useVoiceStore } from '@/stores/voice';

interface VoiceRoomProps {
  token: string;
  serverUrl: string;
  channelId: string;
  onDisconnected: () => void;
  isVideoEnabled?: boolean;
}

function VideoGrid() {
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  const hasScreenShare = screenShareTracks.length > 0;

  // When someone is screen sharing, show their screen prominently
  if (hasScreenShare) {
    // Primary focus: screen share track (shown large)
    const focusTrack = screenShareTracks[0];

    // Secondary: camera tracks in a carousel
    return (
      <FocusLayoutContainer style={{ height: '100%' }}>
        <CarouselLayout
          tracks={cameraTracks}
          style={{ height: '80px' }}
        >
          <ParticipantTile />
        </CarouselLayout>
        <FocusLayout
          trackRef={focusTrack}
          style={{ flex: 1 }}
        />
      </FocusLayoutContainer>
    );
  }

  // No screen share: standard grid layout
  return (
    <GridLayout tracks={cameraTracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

function LocalizedControlBar() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 p-2">
      <TrackToggle
        source={Track.Source.Microphone}
        className="rounded-full bg-gray-700 px-3 py-2 text-xs text-white hover:bg-gray-600"
      >
        {t('voice.microphone')}
      </TrackToggle>
      <TrackToggle
        source={Track.Source.Camera}
        className="rounded-full bg-gray-700 px-3 py-2 text-xs text-white hover:bg-gray-600"
      >
        {t('voice.camera')}
      </TrackToggle>
      <TrackToggle
        source={Track.Source.ScreenShare}
        className="rounded-full bg-indigo-700 px-3 py-2 text-xs text-white hover:bg-indigo-600"
      >
        {t('voice.screenShare')}
      </TrackToggle>
      <DisconnectButton className="rounded-full bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-500">
        {t('voice.disconnect')}
      </DisconnectButton>
    </div>
  );
}

/** Syncs screen share track presence to the voice store for external components */
function ScreenShareSync() {
  const setScreenSharing = useVoiceStore((s) => s.setScreenSharing);
  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  useEffect(() => {
    setScreenSharing(screenShareTracks.length > 0);
  }, [screenShareTracks.length, setScreenSharing]);

  return null;
}

/** Indicator shown when someone is screen sharing */
function ScreenShareIndicator() {
  const { t } = useTranslation();
  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  if (screenShareTracks.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm5 8h4v2H8v-2z" />
      </svg>
      {t('voice.screenSharing')}
    </div>
  );
}

export function VoiceRoom({ token, serverUrl, channelId, onDisconnected, isVideoEnabled }: VoiceRoomProps) {
  const { t } = useTranslation();
  const leavePath = `/api/channels/${channelId}/voice/leave`;

  const sendLeaveKeepalive = useCallback(() => {
    const sessionToken = getSessionToken();
    const headers = new Headers();

    if (sessionToken) {
      headers.set('Authorization', `Bearer ${sessionToken}`);
    }

    fetch(`${getApiBaseUrl()}${leavePath}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      keepalive: true,
    }).catch(() => {});
  }, [leavePath]);

  const handleDisconnected = useCallback(() => {
    // Notify server that we left
    api(leavePath, { method: 'POST' }).catch(() => {});
    onDisconnected();
  }, [leavePath, onDisconnected]);

  // Cleanup on unmount (browser close, navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendLeaveKeepalive();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendLeaveKeepalive]);

  return (
    <div className="flex flex-col border-t border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900" style={{ height: isVideoEnabled ? '400px' : '120px' }}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        onDisconnected={handleDisconnected}
        connect={true}
        video={isVideoEnabled ?? false}
        audio={true}
        data-lk-theme="default"
        style={{ height: '100%' }}
      >
        <ScreenShareSync />
        {isVideoEnabled ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-2 pt-1">
              <ScreenShareIndicator />
            </div>
            <div className="min-h-0 flex-1">
              <VideoGrid />
            </div>
            <LocalizedControlBar />
          </div>
        ) : (
          <>
            <RoomAudioRenderer />
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('voice.connected')}</span>
                <ScreenShareIndicator />
              </div>
              <LocalizedControlBar />
            </div>
          </>
        )}
      </LiveKitRoom>
    </div>
  );
}
