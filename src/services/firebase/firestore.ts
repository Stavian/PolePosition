import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from './config';
import type {
  UserDocument,
  CurrentLocationDocument,
  TripDocument,
  WaypointBatch,
  GroupDocument,
  GroupMemberDocument,
  GroupTripDocument,
  InviteCodeDocument,
  BadgeDefinition,
  EarnedBadge,
  GroupRecapDocument,
  HeatmapPointsDocument,
} from '../../types/firestore';

// ─── Collection References ────────────────────────────────────────────────────

export const usersCol = () =>
  collection(db, 'users') as CollectionReference<UserDocument>;

export const userDoc = (uid: string) =>
  doc(db, 'users', uid) as DocumentReference<UserDocument>;

export const currentLocationDoc = (uid: string) =>
  doc(db, 'users', uid, 'currentLocation', 'live') as DocumentReference<CurrentLocationDocument>;

export const tripsCol = (uid: string) =>
  collection(db, 'users', uid, 'trips') as CollectionReference<TripDocument>;

export const tripDoc = (uid: string, tripId: string) =>
  doc(db, 'users', uid, 'trips', tripId) as DocumentReference<TripDocument>;

export const waypointsCol = (uid: string, tripId: string) =>
  collection(db, 'users', uid, 'trips', tripId, 'waypoints') as CollectionReference<WaypointBatch>;

export const groupsCol = () =>
  collection(db, 'groups') as CollectionReference<GroupDocument>;

export const groupDoc = (groupId: string) =>
  doc(db, 'groups', groupId) as DocumentReference<GroupDocument>;

export const groupMembersCol = (groupId: string) =>
  collection(db, 'groups', groupId, 'members') as CollectionReference<GroupMemberDocument>;

export const groupMemberDoc = (groupId: string, uid: string) =>
  doc(db, 'groups', groupId, 'members', uid) as DocumentReference<GroupMemberDocument>;

export const groupTripsCol = () =>
  collection(db, 'groupTrips') as CollectionReference<GroupTripDocument>;

export const groupTripDoc = (groupTripId: string) =>
  doc(db, 'groupTrips', groupTripId) as DocumentReference<GroupTripDocument>;

export const inviteCodesCol = () =>
  collection(db, 'inviteCodes') as CollectionReference<InviteCodeDocument>;

export const inviteCodeDoc = (code: string) =>
  doc(db, 'inviteCodes', code.toUpperCase()) as DocumentReference<InviteCodeDocument>;

export const badgesCol = () =>
  collection(db, 'badges') as CollectionReference<BadgeDefinition>;

export const badgeDoc = (badgeId: string) =>
  doc(db, 'badges', badgeId) as DocumentReference<BadgeDefinition>;

export const earnedBadgesCol = (uid: string) =>
  collection(db, 'users', uid, 'earnedBadges') as CollectionReference<EarnedBadge>;

export const earnedBadgeDoc = (uid: string, badgeId: string) =>
  doc(db, 'users', uid, 'earnedBadges', badgeId) as DocumentReference<EarnedBadge>;

export const groupRecapsCol = (groupId: string) =>
  collection(db, 'groups', groupId, 'recaps') as CollectionReference<GroupRecapDocument>;

export const heatmapPointsDoc = (groupId: string) =>
  doc(db, 'groups', groupId, 'heatmapPoints', 'data') as DocumentReference<HeatmapPointsDocument>;
