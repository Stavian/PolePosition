import { pb } from './client';
import { Collections } from './collections';
import type { TripRecord, WaypointBatchRecord } from './collections';
import type { WaypointPoint } from '../../types/firestore';

/** Create a new trip record and return its ID */
export async function createTrip(
  userId: string,
  data: Partial<TripRecord>,
): Promise<string> {
  const record = await pb.collection(Collections.Trips).create<TripRecord>({
    user_id: userId,
    status: 'active',
    tags: JSON.stringify([]),
    notes: '',
    drive_score: 100,
    speeding_score: 100,
    braking_score: 100,
    acceleration_score: 100,
    distance_km: 0,
    duration_minutes: 0,
    top_speed_kmh: 0,
    avg_speed_kmh: 0,
    speeding_event_count: 0,
    hard_brake_count: 0,
    hard_acceleration_count: 0,
    waypoint_batch_count: 0,
    started_at: new Date().toISOString(),
    ...data,
  });
  return record.id;
}

/** Update an active trip's live stats */
export async function updateTrip(
  tripId: string,
  data: Partial<TripRecord>,
): Promise<void> {
  await pb.collection(Collections.Trips).update(tripId, data);
}

/** Mark a trip as completed */
export async function completeTrip(
  tripId: string,
  finalData: Partial<TripRecord>,
): Promise<void> {
  await pb.collection(Collections.Trips).update(tripId, {
    ...finalData,
    status: 'completed',
    ended_at: new Date().toISOString(),
  });
}

/** Flush a batch of waypoints to PocketBase */
export async function flushWaypointBatch(
  tripId: string,
  batchIndex: number,
  points: WaypointPoint[],
): Promise<void> {
  await pb.collection(Collections.WaypointBatches).create<WaypointBatchRecord>({
    trip_id: tripId,
    batch_index: batchIndex,
    points: JSON.stringify(points),
  });
}

/** Get completed trips for a user, newest first */
export async function getUserTrips(
  userId: string,
  page = 1,
  perPage = 30,
): Promise<TripRecord[]> {
  const result = await pb.collection(Collections.Trips).getList<TripRecord>(page, perPage, {
    filter: `user_id="${userId}" && status="completed"`,
    sort: '-started_at',
  });
  return result.items;
}

/** Get all waypoint batches for a trip, ordered by index */
export async function getTripWaypoints(tripId: string): Promise<WaypointBatchRecord[]> {
  const result = await pb.collection(Collections.WaypointBatches).getFullList<WaypointBatchRecord>({
    filter: `trip_id="${tripId}"`,
    sort: '+batch_index',
  });
  return result;
}
