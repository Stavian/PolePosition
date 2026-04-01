export interface ActiveTripState {
  tripId: string;
  startedAt: number;        // Unix ms
  distanceKm: number;
  durationSeconds: number;
  currentSpeedKmh: number;
  currentSpeedLimitKmh: number | null;
  topSpeedKmh: number;
  destinationAddress: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  estimatedDurationMinutes: number | null;
  driveScore: number;
  speedingEventCount: number;
  hardBrakeCount: number;
  hardAccelCount: number;
  isPaused: boolean;
}

export interface TripSummary {
  tripId: string;
  startedAt: number;
  endedAt: number;
  distanceKm: number;
  durationMinutes: number;
  estimatedDurationMinutes: number | null;
  driveScore: number;
  topSpeedKmh: number;
  avgSpeedKmh: number;
  speedingEventCount: number;
  hardBrakeCount: number;
  hardAccelCount: number;
  originAddress: string | null;
  destinationAddress: string | null;
  tags: string[];
  notes: string;
  groupId: string | null;
  groupTripId: string | null;
}

export type TripTag = 'work' | 'roadtrip' | 'errand' | 'leisure' | 'other';

export interface RouteCompareResult {
  friendUid: string;
  friendName: string;
  friendTripId: string;
  durationMinutes: number;
  distanceKm: number;
  driveScore: number;
  topSpeedKmh: number;
  timeDeltaMinutes: number;  // negative = friend was faster
}
