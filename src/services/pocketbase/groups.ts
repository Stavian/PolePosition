import { pb } from './client';
import { Collections } from './collections';
import type { GroupRecord, GroupMemberRecord, GroupTripRecord } from './collections';

/** Create a group — calls PocketBase hook which generates invite code */
export async function createGroup(name: string): Promise<{ groupId: string; inviteCode: string }> {
  const result = await pb.send<{ groupId: string; inviteCode: string }>(
    '/api/drivepack/groups/create',
    { method: 'POST', body: { name } },
  );
  return result;
}

/** Join a group by invite code */
export async function joinGroup(code: string): Promise<{ groupId: string }> {
  const result = await pb.send<{ groupId: string }>(
    '/api/drivepack/groups/join',
    { method: 'POST', body: { code: code.toUpperCase() } },
  );
  return result;
}

/** Get a group record */
export async function getGroup(groupId: string): Promise<GroupRecord> {
  return pb.collection(Collections.Groups).getOne<GroupRecord>(groupId);
}

/** Get sorted group leaderboard members */
export async function getGroupMembers(
  groupId: string,
  sortBy: 'weekly_score' | 'monthly_score' | 'all_time_score' = 'weekly_score',
): Promise<GroupMemberRecord[]> {
  return pb.collection(Collections.GroupMembers).getFullList<GroupMemberRecord>({
    filter: `group_id="${groupId}"`,
    sort: `-${sortBy}`,
  });
}

/** Subscribe to real-time group member updates (leaderboard) */
export function subscribeToGroupMembers(
  groupId: string,
  onUpdate: (members: GroupMemberRecord[]) => void,
): () => void {
  const unsub = pb
    .collection(Collections.GroupMembers)
    .subscribe<GroupMemberRecord>('*', async (event) => {
      if (event.record.group_id !== groupId) return;
      // Re-fetch full sorted list on any change
      const members = await getGroupMembers(groupId);
      onUpdate(members);
    });

  return () => {
    unsub.then((u) => u());
  };
}

/** Subscribe to a group trip record */
export function subscribeToGroupTrip(
  groupTripId: string,
  onUpdate: (trip: GroupTripRecord) => void,
): () => void {
  const unsub = pb
    .collection(Collections.GroupTrips)
    .subscribe<GroupTripRecord>(groupTripId, (event) => {
      onUpdate(event.record);
    });

  return () => {
    unsub.then((u) => u());
  };
}

/** Update a participant's ETA in an active group trip */
export async function updateGroupTripParticipant(
  groupTripId: string,
  userId: string,
  data: { currentEtaMinutes?: number; status?: string; arrivedAt?: string },
): Promise<void> {
  // Fetch current, merge participant data, update
  const trip = await pb.collection(Collections.GroupTrips).getOne<GroupTripRecord>(groupTripId);
  const participants = JSON.parse(trip.participants_data ?? '{}');
  participants[userId] = { ...(participants[userId] ?? {}), ...data };
  await pb.collection(Collections.GroupTrips).update(groupTripId, {
    participants_data: JSON.stringify(participants),
  });
}
