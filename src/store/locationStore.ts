import { create } from 'zustand';
import type { CurrentLocationDocument } from '../types/firestore';

interface LocationStoreState {
  myLocation: CurrentLocationDocument | null;
  friendLocations: Record<string, CurrentLocationDocument>;
  setMyLocation: (loc: CurrentLocationDocument) => void;
  setFriendLocation: (uid: string, loc: CurrentLocationDocument) => void;
  removeFriendLocation: (uid: string) => void;
  clearFriendLocations: () => void;
}

export const useLocationStore = create<LocationStoreState>((set) => ({
  myLocation: null,
  friendLocations: {},
  setMyLocation: (loc) => set({ myLocation: loc }),
  setFriendLocation: (uid, loc) =>
    set((state) => ({
      friendLocations: { ...state.friendLocations, [uid]: loc },
    })),
  removeFriendLocation: (uid) =>
    set((state) => {
      const updated = { ...state.friendLocations };
      delete updated[uid];
      return { friendLocations: updated };
    }),
  clearFriendLocations: () => set({ friendLocations: {} }),
}));
