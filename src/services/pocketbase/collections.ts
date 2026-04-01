/**
 * PocketBase collection names — single source of truth.
 * Each constant maps to a collection in the PocketBase admin UI.
 */
export const Collections = {
  // Built-in auth collection (extended with extra fields)
  Users: 'users',
  // Live GPS location — one record per user, updated every 3s
  UserLocations: 'user_locations',
  // Trip records
  Trips: 'trips',
  // Waypoint batches (subcollection-like, filtered by trip_id)
  WaypointBatches: 'waypoint_batches',
  // Friend groups
  Groups: 'groups',
  // Group membership
  GroupMembers: 'group_members',
  // ETA race sessions
  GroupTrips: 'group_trips',
  // Invite codes
  InviteCodes: 'invite_codes',
  // Badge definitions (read-only, seeded by admin)
  Badges: 'badges',
  // Earned badges per user
  EarnedBadges: 'earned_badges',
  // Weekly recap snapshots
  GroupRecaps: 'group_recaps',
  // Aggregated heatmap points per group
  HeatmapPoints: 'heatmap_points',
} as const;

/**
 * PocketBase record interfaces.
 * All PB records have: id, created, updated fields (auto-managed).
 */

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  name: string;          // displayName
  avatar: string;        // file field
  group_ids: string[];   // relation field (JSON array stored as text)
  fcm_token: string;
  unit_preference: 'kmh' | 'mph';
  share_location_with: 'group' | 'nobody';
  total_trips: number;
  total_distance_km: number;
  lifetime_drive_score: number;
  weekly_drive_score: number;
  badge_ids: string[];
  created: string;
  updated: string;
}

export interface UserLocationRecord {
  id: string;
  user_id: string;      // relation to users
  lat: number;
  lng: number;
  speed: number;        // m/s
  heading: number;
  accuracy: number;
  is_active: boolean;
  active_trip_id: string;
  updated: string;
}

export interface TripRecord {
  id: string;
  user_id: string;
  group_id: string;
  group_trip_id: string;
  started_at: string;
  ended_at: string;
  status: 'active' | 'completed' | 'discarded';
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  distance_km: number;
  duration_minutes: number;
  estimated_duration_minutes: number;
  tags: string;          // JSON array stored as text
  notes: string;
  drive_score: number;
  speeding_score: number;
  braking_score: number;
  acceleration_score: number;
  top_speed_kmh: number;
  avg_speed_kmh: number;
  speeding_event_count: number;
  hard_brake_count: number;
  hard_acceleration_count: number;
  waypoint_batch_count: number;
  created: string;
  updated: string;
}

export interface WaypointBatchRecord {
  id: string;
  trip_id: string;
  batch_index: number;
  points: string; // JSON array of {lat, lng, speed, speed_limit, heading, timestamp}
  created: string;
}

export interface GroupRecord {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  invite_code_expires_at: string;
  member_ids: string;    // JSON array
  max_members: number;
  allow_member_invites: boolean;
  total_group_trips: number;
  total_group_distance_km: number;
  top_driver_id: string;
  created: string;
  updated: string;
}

export interface GroupMemberRecord {
  id: string;
  group_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  role: 'owner' | 'admin' | 'member';
  weekly_score: number;
  monthly_score: number;
  all_time_score: number;
  weekly_trips: number;
  weekly_distance_km: number;
  created: string;
  updated: string;
}

export interface GroupTripRecord {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  status: 'waiting' | 'active' | 'completed';
  participant_ids: string; // JSON array
  participants_data: string; // JSON object with participant state
  created: string;
  updated: string;
}

export interface InviteCodeRecord {
  id: string;
  code: string;
  group_id: string;
  expires_at: string;
  usage_count: number;
  created: string;
}

export interface BadgeRecord {
  id: string;
  badge_key: string;
  icon: string;
  category: string;
  criteria_type: string;
  criteria_threshold: number;
  created: string;
}

export interface EarnedBadgeRecord {
  id: string;
  user_id: string;
  badge_key: string;
  triggering_trip_id: string;
  created: string;
}

export interface HeatmapPointsRecord {
  id: string;
  group_id: string;
  points: string; // JSON array of {lat, lng, weight}
  updated: string;
}
