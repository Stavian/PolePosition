import * as functions from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { evaluateBadges, BADGE_DEFINITIONS } from '../../badgeEngine';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Triggered when a trip document's status changes to 'completed'.
 * Responsibilities:
 * 1. Compute authoritative drive score
 * 2. Update user stats (denormalized)
 * 3. Update group member stats
 * 4. Award badges
 * 5. Append downsampled waypoints to group heatmap
 */
export const onTripCompleted = functions.onDocumentUpdated(
  'users/{uid}/trips/{tripId}',
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const { uid, tripId } = event.params;

    if (before?.status !== 'active' || after?.status !== 'completed') return;

    const batch = db.batch();

    // 1. Update user stats
    batch.update(db.doc(`users/${uid}`), {
      'stats.totalTrips': admin.firestore.FieldValue.increment(1),
      'stats.totalDistanceKm': admin.firestore.FieldValue.increment(after.distanceKm ?? 0),
      'stats.totalDrivingMinutes': admin.firestore.FieldValue.increment(after.durationMinutes ?? 0),
    });

    // 2. Update group member stats
    if (after.groupId) {
      batch.update(db.doc(`groups/${after.groupId}/members/${uid}`), {
        weeklyScore: after.driveScore ?? 0,
        weeklyTrips: admin.firestore.FieldValue.increment(1),
        weeklyDistanceKm: admin.firestore.FieldValue.increment(after.distanceKm ?? 0),
        allTimeScore: after.driveScore ?? 0,
      });
    }

    // 3. Evaluate badges
    const [userSnap, recentTripsSnap] = await Promise.all([
      db.doc(`users/${uid}`).get(),
      db.collection(`users/${uid}/trips`)
        .where('status', '==', 'completed')
        .orderBy('startedAt', 'desc')
        .limit(20)
        .get(),
    ]);

    const userData = userSnap.data();
    const recentTrips = recentTripsSnap.docs.map((d) => d.data());

    const newBadgeIds = evaluateBadges({
      trip: after as any,
      user: userData as any,
      recentTrips: recentTrips as any,
    });

    if (newBadgeIds.length > 0) {
      const earnedAt = admin.firestore.FieldValue.serverTimestamp();
      for (const badgeId of newBadgeIds) {
        batch.set(db.doc(`users/${uid}/earnedBadges/${badgeId}`), {
          badgeId,
          earnedAt,
          triggeringTripId: tripId,
        });
      }
      batch.update(db.doc(`users/${uid}`), {
        'stats.badgeIds': admin.firestore.FieldValue.arrayUnion(...newBadgeIds),
      });
    }

    await batch.commit();

    // 4. Append downsampled waypoints to group heatmap
    if (after.groupId && after.waypointBatchCount > 0) {
      await appendToHeatmap(uid, tripId, after.groupId, after.waypointBatchCount);
    }

    // 5. Send badge push notifications
    if (newBadgeIds.length > 0 && userData?.fcmToken) {
      for (const badgeId of newBadgeIds) {
        const def = BADGE_DEFINITIONS.find((b) => b.badgeId === badgeId);
        if (!def) continue;
        await messaging.send({
          token: userData.fcmToken,
          notification: {
            title: '🏅 Neues Abzeichen!',
            body: `Du hast "${badgeId}" freigeschaltet!`,
          },
          data: { type: 'badge', badgeId },
        }).catch(() => {}); // Ignore stale tokens
      }
    }
  },
);

async function appendToHeatmap(
  uid: string,
  tripId: string,
  groupId: string,
  batchCount: number,
): Promise<void> {
  const MAX_HEATMAP_POINTS = 5000;
  const SAMPLE_EVERY = 10; // take every 10th waypoint

  const sampledPoints: Array<{ lat: number; lng: number; weight: number }> = [];

  for (let i = 0; i < batchCount; i++) {
    const batchSnap = await db
      .collection(`users/${uid}/trips/${tripId}/waypoints`)
      .where('batchIndex', '==', i)
      .limit(1)
      .get();
    if (batchSnap.empty) continue;
    const pts = batchSnap.docs[0].data()?.points ?? [];
    for (let j = 0; j < pts.length; j += SAMPLE_EVERY) {
      sampledPoints.push({ lat: pts[j].lat, lng: pts[j].lng, weight: 1 });
    }
  }

  if (sampledPoints.length === 0) return;

  const heatmapRef = db.doc(`groups/${groupId}/heatmapPoints/data`);
  const snap = await heatmapRef.get();
  const existing: Array<{ lat: number; lng: number; weight: number }> = snap.exists
    ? snap.data()?.points ?? []
    : [];

  // Merge and cap
  const merged = [...existing, ...sampledPoints].slice(-MAX_HEATMAP_POINTS);
  await heatmapRef.set({
    groupId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    points: merged,
  });
}
