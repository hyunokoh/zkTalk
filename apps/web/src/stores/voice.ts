import { create } from 'zustand';

export interface VoiceParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
}

interface VoiceState {
  token: string | null;
  channelId: string | null;
  isVideoEnabled: boolean;
  isConnected: boolean;
  isScreenSharing: boolean;
  participants: VoiceParticipant[];
  connect: (channelId: string, token: string, isVideo: boolean, participants?: VoiceParticipant[]) => void;
  disconnect: () => void;
  setParticipants: (participants: VoiceParticipant[]) => void;
  addParticipant: (participant: VoiceParticipant) => void;
  removeParticipant: (userId: string) => void;
  setScreenSharing: (isSharing: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  token: null,
  channelId: null,
  isVideoEnabled: false,
  isConnected: false,
  isScreenSharing: false,
  participants: [],

  connect: (channelId: string, token: string, isVideo: boolean, participants?: VoiceParticipant[]) =>
    set({ channelId, token, isVideoEnabled: isVideo, isConnected: true, isScreenSharing: false, participants: participants ?? [] }),

  disconnect: () =>
    set({ channelId: null, token: null, isVideoEnabled: false, isConnected: false, isScreenSharing: false, participants: [] }),

  setParticipants: (participants: VoiceParticipant[]) => set({ participants }),

  addParticipant: (participant: VoiceParticipant) =>
    set((state) => ({
      participants: state.participants.some((p) => p.userId === participant.userId)
        ? state.participants
        : [...state.participants, participant],
    })),

  removeParticipant: (userId: string) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),

  setScreenSharing: (isSharing: boolean) => set({ isScreenSharing: isSharing }),
}));
