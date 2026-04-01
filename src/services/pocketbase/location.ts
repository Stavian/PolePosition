import { pb } from './client';
import { Collections } from './collections';
import type { UserLocationRecord } from './collections';

// Cache the location record ID per user to avoid repeated lookups
const locationRecordCache: Record<string, string> = {};

/**
 * Upsert the user's live location.
 * PocketBase doesn't have Firestore's "set with merge" — we maintain one
 * record per user and update it in place.
 */
export async function upsertUserLocation(
  userId: string,
  data: Omit<UserLocationRecord, 'id' | 'user_id' | 'updated'>,
): Promise<void> {
  // Check cache first
  if (locationRecordCache[userId]) {
    try {
      await pb.collection(Collections.UserLocations).update(locationRecordCache[userId], data);
      return;
    } catch {
      // Record may have been deleted; fall through to create
      delete locationRecordCache[userId];
    }
  }

  // Look up existing record
  try {
    const existing = await pb
      .collection(Collections.UserLocations)
      .getFirstListItem<UserLocationRecord>(`user_id="${userId}"`);
    locationRecordCache[userId] = existing.id;
    await pb.collection(Collections.UserLocations).update(existing.id, data);
  } catch {
    // Create new
    const created = await pb.collection(Collections.UserLocations).create<UserLocationRecord>({
      user_id: userId,
      ...data,
    });
    locationRecordCache[userId] = created.id;
  }
}

/**
 * Subscribe to real-time location updates for a list of user IDs.
 * Returns an unsubscribe function.
 */
export function subscribeToFriendLocations(
  userIds: string[],
  onUpdate: (userId: string, location: UserLocationRecord) => void,
): () => void {
  const unsubPromise = pb
    .collection(Collections.UserLocations)
    .subscribe<UserLocationRecord>('*', (event) => {
      if (event.action !== 'create' && event.action !== 'update') return;
      const loc = event.record;
      if (userIds.includes(loc.user_id)) {
        const updatedMs = new Date(loc.updated).getTime();
        if (Date.now() - updatedMs < 5 * 60 * 1000) {
          onUpdate(loc.user_id, loc);
        }
      }
    });

  return () => {
    unsubPromise.then((unsub) => unsub());
  };
}

/**
 * Subscribe to ALL users' location updates (excluding the current user).
 * Used when there's a single shared group — all app users see each other.
 */
export function subscribeToAllUserLocations(
  currentUserId: string,
  onUpdate: (userId: string, location: UserLocationRecord) => void,
): () => void {
  const unsubPromise = pb
    .collection(Collections.UserLocations)
    .subscribe<UserLocationRecord>('*', (event) => {
      if (event.action !== 'create' && event.action !== 'update') return;
      const loc = event.record;
      if (loc.user_id === currentUserId) return;
      const updatedMs = new Date(loc.updated).getTime();
      if (Date.now() - updatedMs < 5 * 60 * 1000) {
        onUpdate(loc.user_id, loc);
      }
    });

  return () => {
    unsubPromise.then((unsub) => unsub());
  };
}

/**
 * Fetch all users sorted by weekly drive score (leaderboard).
 */
export async function getAllUsersLeaderboard(): Promise<
  { id: string; name: string; weeklyScore: number; weeklyTrips: number; weeklyDistanceKm: number }[]
> {
  const records = await pb.collection(Collections.Users).getFullList({
    sort: '-weekly_drive_score',
    fields: 'id,name,weekly_drive_score,total_trips,total_distance_km',
  });
  return records.map((r: any) => ({
    id: r.id,
    name: r.name,
    weeklyScore: r.weekly_drive_score ?? 0,
    weeklyTrips: r.weekly_trips ?? 0,
    weeklyDistanceKm: r.weekly_distance_km ?? 0,
  }));
}
