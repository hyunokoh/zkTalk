import { create } from 'zustand';

interface ThreadState {
  activeThreadId: string | null;
  openThread: (threadId: string) => void;
  closeThread: () => void;
}

export const useThreadStore = create<ThreadState>((set) => ({
  activeThreadId: null,

  openThread: (threadId: string) => set({ activeThreadId: threadId }),

  closeThread: () => set({ activeThreadId: null }),
}));
