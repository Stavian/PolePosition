import { pb } from './client';
import type { UserRecord } from './collections';
import { Collections } from './collections';

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
): Promise<UserRecord> => {
  const record = await pb.collection(Collections.Users).create<UserRecord>({
    email,
    password,
    passwordConfirm: password,
    name: displayName,
    username: displayName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
    unit_preference: 'kmh',
    share_location_with: 'group',
    group_ids: JSON.stringify([]),
    badge_ids: JSON.stringify([]),
    total_trips: 0,
    total_distance_km: 0,
    lifetime_drive_score: 0,
    weekly_drive_score: 0,
  });

  // Auto sign-in after registration
  await pb.collection(Collections.Users).authWithPassword(email, password);
  return record;
};

// ─── Sign In ──────────────────────────────────────────────────────────────────

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<UserRecord> => {
  const auth = await pb.collection(Collections.Users).authWithPassword<UserRecord>(email, password);
  return auth.record;
};

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export const signOut = () => {
  pb.authStore.clear();
};

// ─── Auth State ───────────────────────────────────────────────────────────────

export const getCurrentUser = (): UserRecord | null => {
  if (!pb.authStore.isValid) return null;
  return pb.authStore.model as UserRecord | null;
};

export const onAuthStateChange = (
  cb: (user: UserRecord | null) => void,
): (() => void) => {
  // PocketBase fires onChange when token changes (login/logout/refresh)
  return pb.authStore.onChange(() => {
    cb(getCurrentUser());
  });
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshAuth = async (): Promise<void> => {
  if (!pb.authStore.isValid) return;
  try {
    await pb.collection(Collections.Users).authRefresh();
  } catch {
    pb.authStore.clear();
  }
};

// ─── Update FCM Token ─────────────────────────────────────────────────────────

export const updateFcmToken = async (token: string): Promise<void> => {
  const user = getCurrentUser();
  if (!user) return;
  await pb.collection(Collections.Users).update(user.id, { fcm_token: token });
};
