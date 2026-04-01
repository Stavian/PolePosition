import { create } from 'zustand';
import type { User } from 'firebase/auth';
import type { UserDocument } from '../types/firestore';

interface AuthState {
  user: User | null;
  userDoc: UserDocument | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setUserDoc: (doc: UserDocument | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userDoc: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: () => set({ isInitialized: true, isLoading: false }),
}));
