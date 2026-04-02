// Plain object types (no Firebase dependency)
export type Timestamp = {
  toDate(): Date;
  toMillis(): number;
  seconds: number;
  nanoseconds: number;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserStats {
  totalTrips: number;
  totalDistanceKm: number;
  totalDrivingMinutes: number;
  lifetimeDriveScore: number;
  weeklyDriveScore: number;
  monthlyDriveScore: number;
  badgeIds: string[];
}

export interface PrivacySettings {
  shareLocationWith: 'group' | 'nobody';
}

export interface UserDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  createdAt: Timestamp;
  groupIds: string[];
  fcmToken: string | null;
  unitPreference: 'kmh' | 'mph';
  privacySettings: PrivacySettings;
  stats: UserStats;
}

// ─── Current Location (single doc per user, overwritten live) ─────────────────

export interface CurrentLocationDocument {
  lat: number;
  lng: number;
  speed: number;        // m/s
  heading: number;      // degrees 0–360
  accuracy: number;     // meters
  isActive: boolean;    // false when parked/offline
  activeTripId: string | null;
  updatedAt: Timestamp;
}

// ─── Trips ────────────────────────────────────────────────────────────────────

export type TripStatus = 'active' | 'completed' | 'discarded';

export interface ScoreBreakdown {
  speedingScore: number;
  brakingScore: number;
  accelerationScore: number;
}

export interface TripDocument {
  tripId: string;
  userId: string;
  groupId: string | null;
  groupTripId: string | null;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  status: TripStatus;
  originLat: number;
  originLng: number;
  destinationLat: number | null;
  destinationLng: number | null;
  destinationAddress: string | null;
  distanceKm: number;
  durationMinutes: number;
  estimatedDurationMinutes: number | null;
  tags: string[];
  notes: string;
  driveScore: number;
  scoreBreakdown: ScoreBreakdown;
  topSpeedKmh: number;
  avgSpeedKmh: number;
  speedingEventCount: number;
  hardBrakeCount: number;
  hardAccelerationCount: number;
  waypointBatchCount: number;
}

// ─── Waypoints (subcollection, batched) ───────────────────────────────────────

export interface WaypointPoint {
  lat: number;
  lng: number;
  speed: number;        // m/s
  speedLimit: number | null;  // km/h
  heading: number;
  timestamp: number;    // Unix ms
}

export interface WaypointBatch {
  batchIndex: number;
  points: WaypointPoint[];
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface GroupSettings {
  maxMembers: number;
  allowMemberInvites: boolean;
}

export interface GroupStats {
  totalGroupTrips: number;
  totalGroupDistanceKm: number;
  topDriverUid: string | null;
  weeklyRecapGeneratedAt: Timestamp | null;
}

export interface GroupDocument {
  groupId: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
  inviteCode: string;
  inviteCodeExpiresAt: Timestamp | null;
  memberUids: string[];
  settings: GroupSettings;
  stats: GroupStats;
}

// ─── Group Members (subcollection) ────────────────────────────────────────────

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupMemberDocument {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  role: GroupRole;
  joinedAt: Timestamp;
  weeklyScore: number;
  monthlyScore: number;
  allTimeScore: number;
  weeklyTrips: number;
  weeklyDistanceKm: number;
}

// ─── Group Trips (ETA Race) ────────────────────────────────────────────────────

export type GroupTripStatus = 'waiting' | 'active' | 'completed';
export type ParticipantStatus = 'waiting' | 'driving' | 'arrived';

export interface GroupTripParticipant {
  displayName: string;
  avatarUrl: string | null;
  joinedAt: Timestamp;
  status: ParticipantStatus;
  arrivedAt: Timestamp | null;
  arrivalRank: number | null;
  currentEtaMinutes: number | null;
  tripId: string | null;
  driveScore: number | null;
  currentLat: number | null;
  currentLng: number | null;
}

export interface GroupTripDocument {
  groupTripId: string;
  groupId: string;
  createdBy: string;
  title: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  startedAt: Timestamp;
  status: GroupTripStatus;
  participantUids: string[];
  participants: Record<string, GroupTripParticipant>;
}

// ─── Invite Codes ─────────────────────────────────────────────────────────────

export interface InviteCodeDocument {
  code: string;
  groupId: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  usageCount: number;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export type BadgeCategory = 'safety' | 'distance' | 'social' | 'time' | 'fun';
export type BadgeCriteriaType =
  | 'score_threshold'
  | 'trip_count'
  | 'distance'
  | 'time_of_day'
  | 'speed_event'
  | 'duration';

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  threshold: number;
  consecutiveRequired: boolean;
  timeWindowDays: number | null;
}

export interface BadgeDefinition {
  badgeId: string;
  nameKey: string;
  descriptionKey: string;
  iconName: string;
  category: BadgeCategory;
  criteria: BadgeCriteria;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: Timestamp;
  triggeringTripId: string | null;
}

// ─── Group Recaps ─────────────────────────────────────────────────────────────

export interface MemberRecapEntry {
  uid: string;
  displayName: string;
  weeklyScore: number;
  weeklyTrips: number;
  weeklyDistanceKm: number;
  rank: number;
  scoreDelta: number;  // vs previous week
}

export interface GroupRecapDocument {
  weekId: string;           // e.g. "2026-W14"
  groupId: string;
  generatedAt: Timestamp;
  members: MemberRecapEntry[];
  totalGroupDistanceKm: number;
  totalGroupTrips: number;
  topSpeedKmh: number;
  topSpeedDriverUid: string;
  mostImprovedUid: string | null;
}

// ─── Heatmap Points (aggregated, capped at 5000) ──────────────────────────────

export interface HeatmapPointsDocument {
  groupId: string;
  updatedAt: Timestamp;
  points: Array<{ lat: number; lng: number; weight: number }>;
}
