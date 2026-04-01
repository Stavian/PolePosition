import { create } from 'zustand';
import type { ActiveTripState } from '../types/trip';

interface TripStoreState {
  activeTrip: ActiveTripState | null;
  setActiveTrip: (trip: ActiveTripState | null) => void;
  updateActiveTrip: (partial: Partial<ActiveTripState>) => void;
}

export const useTripStore = create<TripStoreState>((set) => ({
  activeTrip: null,
  setActiveTrip: (activeTrip) => set({ activeTrip }),
  updateActiveTrip: (partial) =>
    set((state) =>
      state.activeTrip ? { activeTrip: { ...state.activeTrip, ...partial } } : state,
    ),
}));
