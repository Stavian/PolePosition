import { create } from 'zustand';
import type { GroupMemberDocument } from '../types/firestore';

interface LeaderboardStoreState {
  members: GroupMemberDocument[];
  setMembers: (members: GroupMemberDocument[]) => void;
}

export const useGroupStore = create<LeaderboardStoreState>((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
}));
