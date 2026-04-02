import { create } from 'zustand';
import type { GroupTripRecord } from '../services/pocketbase/collections';

export interface GroupMember {
  uid: string;
  displayName: string;
  weeklyScore: number;
  monthlyScore: number;
  allTimeScore: number;
  weeklyTrips: number;
  weeklyDistanceKm: number;
}

interface GroupStoreState {
  members: GroupMember[];
  setMembers: (members: GroupMember[]) => void;
  activeGroupTrip: GroupTripRecord | null;
  setActiveGroupTrip: (trip: GroupTripRecord | null) => void;
}

export const useGroupStore = create<GroupStoreState>((set) => ({
  members: [],
  setMembers: (members) => set({ members }),
  activeGroupTrip: null,
  setActiveGroupTrip: (activeGroupTrip) => set({ activeGroupTrip }),
}));
