import { create } from 'zustand';
import type { UserRecord } from '../services/pocketbase/collections';

interface AuthState {
  userDoc: UserRecord | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUserDoc: (doc: UserRecord | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userDoc: null,
  isLoading: true,
  isInitialized: false,
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: () => set({ isInitialized: true, isLoading: false }),
}));
