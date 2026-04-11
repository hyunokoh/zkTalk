import { create } from 'zustand';

interface OfflineQueueState {
  pendingByChannel: Record<string, number>;
  failedByChannel: Record<string, number>;
  queuedMessagesByChannel: Record<string, Array<{
    id: string;
    bodyMarkdown: string;
    createdAt: number;
    threadId?: string | null;
    parentMessageId?: string | null;
    topic?: string | null;
    status: 'pending' | 'sending' | 'failed';
  }>>;
  reset: () => void;
  setChannelCounts: (channelId: string, counts: { pending: number; failed: number }) => void;
  setQueuedMessages: (channelId: string, messages: Array<{
    id: string;
    bodyMarkdown: string;
    createdAt: number;
    threadId?: string | null;
    parentMessageId?: string | null;
    topic?: string | null;
    status: 'pending' | 'sending' | 'failed';
  }>) => void;
  clearChannelCounts: (channelId: string) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  pendingByChannel: {},
  failedByChannel: {},
  queuedMessagesByChannel: {},
  reset: () => set({
    pendingByChannel: {},
    failedByChannel: {},
    queuedMessagesByChannel: {},
  }),
  setChannelCounts: (channelId, counts) => {
    set((state) => ({
      pendingByChannel: {
        ...state.pendingByChannel,
        [channelId]: counts.pending,
      },
      failedByChannel: {
        ...state.failedByChannel,
        [channelId]: counts.failed,
      },
    }));
  },
  setQueuedMessages: (channelId, messages) => {
    set((state) => ({
      queuedMessagesByChannel: {
        ...state.queuedMessagesByChannel,
        [channelId]: messages,
      },
    }));
  },
  clearChannelCounts: (channelId) => {
    set((state) => {
      const nextPending = { ...state.pendingByChannel };
      const nextFailed = { ...state.failedByChannel };
      const nextQueuedMessages = { ...state.queuedMessagesByChannel };
      delete nextPending[channelId];
      delete nextFailed[channelId];
      delete nextQueuedMessages[channelId];
      return {
        pendingByChannel: nextPending,
        failedByChannel: nextFailed,
        queuedMessagesByChannel: nextQueuedMessages,
      };
    });
  },
}));
