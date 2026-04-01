import { useEffect } from 'react';
import { pb } from '../services/pocketbase/client';
import { refreshAuth, onAuthStateChange } from '../services/pocketbase/auth';
import { useAuthStore } from '../store/authStore';
import type { UserRecord } from '../services/pocketbase/collections';
import { Collections } from '../services/pocketbase/collections';

/**
 * Bootstraps PocketBase auth state and keeps the user document in sync.
 * Call once in the root layout.
 */
export const useAuthBootstrap = () => {
  const { setUserDoc, setInitialized } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Restore persisted auth token
      await pb.restoreAuth();

      // Refresh token validity
      await refreshAuth();

      if (mounted) {
        const model = pb.authStore.isValid ? (pb.authStore.model as UserRecord) : null;
        setUserDoc(model as any);
        setInitialized();
      }
    })();

    // Listen for auth changes (login / logout)
    const unsub = onAuthStateChange((user) => {
      if (!mounted) return;
      setUserDoc(user as any);
      if (!pb.authStore.isValid) setInitialized();
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);
};

export const useAuth = () => {
  const userDoc = useAuthStore((s) => s.userDoc);
  return userDoc ? (pb.authStore.model as UserRecord) : null;
};

export const useUserDoc = () => useAuthStore((s) => s.userDoc) as UserRecord | null;
export const useAuthLoading = () => useAuthStore((s) => s.isLoading);
export const useAuthInitialized = () => useAuthStore((s) => s.isInitialized);
