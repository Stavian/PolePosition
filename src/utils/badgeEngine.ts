import type { BadgeDefinition, TripDocument, UserDocument } from '../types/firestore';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    badgeId: 'clean_driver',
    nameKey: 'badges.names.cleanDriver',
    descriptionKey: 'badges.descriptions.cleanDriver',
    iconName: '⭐',
    category: 'safety',
    criteria: { type: 'score_threshold', threshold: 90, consecutiveRequired: true, timeWindowDays: null },
  },
  {
    badgeId: 'speed_demon',
    nameKey: 'badges.names.speedDemon',
    descriptionKey: 'badges.descriptions.speedDemon',
    iconName: '⚡',
    category: 'fun',
    criteria: { type: 'speed_event', threshold: 160, consecutiveRequired: false, timeWindowDays: null },
  },
  {
    badgeId: 'night_owl',
    nameKey: 'badges.names.nightOwl',
    descriptionKey: 'badges.descriptions.nightOwl',
    iconName: '🦉',
    category: 'time',
    criteria: { type: 'time_of_day', threshold: 5, consecutiveRequired: false, timeWindowDays: 90 },
  },
  {
    badgeId: 'marathon',
    nameKey: 'badges.names.marathon',
    descriptionKey: 'badges.descriptions.marathon',
    iconName: '🏔',
    category: 'distance',
    criteria: { type: 'distance', threshold: 200, consecutiveRequired: false, timeWindowDays: null },
  },
  {
    badgeId: 'group_champion',
    nameKey: 'badges.names.groupChampion',
    descriptionKey: 'badges.descriptions.groupChampion',
    iconName: '🏆',
    category: 'social',
    criteria: { type: 'trip_count', threshold: 4, consecutiveRequired: true, timeWindowDays: 28 },
  },
  {
    badgeId: 'smooth_operator',
    nameKey: 'badges.names.smoothOperator',
    descriptionKey: 'badges.descriptions.smoothOperator',
    iconName: '🧈',
    category: 'safety',
    criteria: { type: 'score_threshold', threshold: 0, consecutiveRequired: false, timeWindowDays: null },
  },
  {
    badgeId: 'early_bird',
    nameKey: 'badges.names.earlyBird',
    descriptionKey: 'badges.descriptions.earlyBird',
    iconName: '🌅',
    category: 'time',
    criteria: { type: 'time_of_day', threshold: 5, consecutiveRequired: false, timeWindowDays: 60 },
  },
  {
    badgeId: 'road_tripper',
    nameKey: 'badges.names.roadTripper',
    descriptionKey: 'badges.descriptions.roadTripper',
    iconName: '🗺',
    category: 'distance',
    criteria: { type: 'duration', threshold: 180, consecutiveRequired: false, timeWindowDays: null },
  },
];

export interface BadgeEvalContext {
  trip: TripDocument;
  user: UserDocument;
  recentTrips: TripDocument[];
}

/**
 * Evaluate which badge IDs should be awarded after completing a trip.
 * Returns badge IDs not already earned.
 */
export function evaluateBadges(ctx: BadgeEvalContext): string[] {
  const { trip, user, recentTrips } = ctx;
  const alreadyEarned = new Set(user.stats.badgeIds);
  const toAward: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (alreadyEarned.has(badge.badgeId)) continue;
    if (checkBadge(badge, ctx)) {
      toAward.push(badge.badgeId);
    }
  }
  return toAward;
}

function checkBadge(badge: BadgeDefinition, ctx: BadgeEvalContext): boolean {
  const { trip, recentTrips } = ctx;
  const tripStartDate = trip.startedAt?.toDate?.() ?? new Date();
  const tripHour = tripStartDate.getHours();

  switch (badge.badgeId) {
    case 'clean_driver': {
      // 10 consecutive trips with score >= 90
      const last10 = recentTrips.slice(-10);
      return last10.length >= 10 && last10.every((t) => t.driveScore >= 90);
    }
    case 'speed_demon': {
      return trip.topSpeedKmh >= 160 && trip.speedingEventCount === 0;
    }
    case 'night_owl': {
      // Count trips between 23:00 and 04:00 in recent 90 days
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const nightTrips = recentTrips.filter((t) => {
        const h = t.startedAt?.toDate?.().getHours?.() ?? 12;
        const ts = t.startedAt?.toMillis?.() ?? 0;
        return (h >= 23 || h < 4) && ts >= cutoff;
      });
      return nightTrips.length >= 5;
    }
    case 'marathon': {
      return trip.distanceKm >= 200;
    }
    case 'smooth_operator': {
      return trip.hardBrakeCount === 0 && trip.distanceKm >= 30;
    }
    case 'early_bird': {
      const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
      const earlyTrips = recentTrips.filter((t) => {
        const h = t.startedAt?.toDate?.().getHours?.() ?? 12;
        const ts = t.startedAt?.toMillis?.() ?? 0;
        return h < 7 && ts >= cutoff;
      });
      return earlyTrips.length >= 5;
    }
    case 'road_tripper': {
      return trip.durationMinutes >= 180;
    }
    case 'group_champion': {
      // This badge is awarded by Cloud Function (rank 1 for 4 consecutive weeks)
      return false;
    }
    default:
      return false;
  }
}
