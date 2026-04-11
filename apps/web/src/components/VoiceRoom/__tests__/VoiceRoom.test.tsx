import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceRoom } from '../VoiceRoom';

const mockUseTracks = vi.fn(() => []);
const mockRoomAudioRenderer = vi.fn(() => <div>RoomAudioRenderer</div>);
const mockLiveKitRoom = vi.fn(
  ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
);

vi.mock('@livekit/components-react', () => ({
  LiveKitRoom: (props: { children?: React.ReactNode }) => mockLiveKitRoom(props),
  RoomAudioRenderer: () => mockRoomAudioRenderer(),
  GridLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ParticipantTile: () => <div>ParticipantTile</div>,
  useTracks: () => mockUseTracks(),
  TrackToggle: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  DisconnectButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
  FocusLayout: () => <div>FocusLayout</div>,
  FocusLayoutContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CarouselLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@livekit/components-styles', () => ({}));

vi.mock('livekit-client', () => ({
  Track: {
    Source: {
      Camera: 'camera',
      ScreenShare: 'screen',
      Microphone: 'microphone',
    },
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/voice', () => ({
  useVoiceStore: (selector: (state: { setScreenSharing: (value: boolean) => void }) => unknown) =>
    selector({
      setScreenSharing: vi.fn(),
    }),
}));

vi.mock('@/lib/runtime-config', () => ({
  getApiBaseUrl: () => 'http://127.0.0.1:4000',
}));

const mockCreateAuthHeaders = vi.fn(() => new Headers({ Authorization: 'Bearer session-token' }));
const mockApi = vi.fn();

vi.mock('@/lib/api', () => ({
  api: (...args: Parameters<typeof mockApi>) => mockApi(...args),
  createAuthHeaders: (...args: Parameters<typeof mockCreateAuthHeaders>) => mockCreateAuthHeaders(...args),
}));

describe('VoiceRoom', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockApi.mockReset();
    mockCreateAuthHeaders.mockClear();
    mockUseTracks.mockReset();
    mockRoomAudioRenderer.mockClear();
    mockLiveKitRoom.mockClear();
  });

  it('keeps desktop bearer auth on beforeunload leave requests', () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    render(
      <VoiceRoom
        token="voice-token"
        serverUrl="wss://livekit.example.com"
        channelId="channel-1"
        onDisconnected={vi.fn()}
      />,
    );

    window.dispatchEvent(new Event('beforeunload'));

    expect(mockCreateAuthHeaders).toHaveBeenCalledWith('http://127.0.0.1:4000');
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/channels/channel-1/voice/leave',
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Headers),
        credentials: 'include',
        keepalive: true,
      }),
    );
    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer session-token');
  });
});
