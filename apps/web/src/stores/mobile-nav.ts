import { create } from 'zustand';

interface MobileNavStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
  channelSidebarOpen: boolean;
  toggleChannelSidebar: () => void;
  closeChannelSidebar: () => void;
  openChannelSidebar: () => void;
  /** DM: true = show list, false = show conversation */
  dmShowList: boolean;
  setDmShowList: (show: boolean) => void;
}

export const useMobileNavStore = create<MobileNavStore>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  openSidebar: () => set({ sidebarOpen: true }),
  channelSidebarOpen: false,
  toggleChannelSidebar: () => set((s) => ({ channelSidebarOpen: !s.channelSidebarOpen })),
  closeChannelSidebar: () => set({ channelSidebarOpen: false }),
  openChannelSidebar: () => set({ channelSidebarOpen: true }),
  dmShowList: true,
  setDmShowList: (show: boolean) => set({ dmShowList: show }),
}));
