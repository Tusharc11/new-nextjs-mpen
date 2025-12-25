import { create } from 'zustand';

interface SidebarState {
  isExpanded: boolean;
  organizationName: string;
  toggleSidebar: () => void;
  setOrganizationName: (name: string) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isExpanded: false,
  organizationName: 'Organization',
  toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
  setOrganizationName: (name: string) => set({ organizationName: name }),
}));
