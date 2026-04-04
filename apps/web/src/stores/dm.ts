import { create } from 'zustand';

interface DmState {
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
}

export const useDmStore = create<DmState>((set) => ({
  activeConversationId: null,
  setActiveConversation: (id) => set({ activeConversationId: id }),
}));
