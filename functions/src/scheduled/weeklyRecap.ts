import * as functions from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Runs every Monday at 08:00 CET (07:00 UTC).
 * Computes weekly stats for all groups and sends recap push notifications.
 */
export const weeklyRecap = functions.onSchedule(
  {
    schedule: '0 7 * * 1', // Every Monday 07:00 UTC
    timeZone: 'Europe/Berlin',
  },
  async () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekId = getWeekId();

    const groupsSnap = await db.collection('groups').get();

    for (const groupDoc of groupsSnap.docs) {
      const groupData = groupDoc.data();
      const groupId = groupDoc.id;
      const memberUids: string[] = groupData.memberUids ?? [];

      if (memberUids.length === 0) continue;

      const memberStats: Array<{
        uid: string;
        displayName: string;
        weeklyScore: number;
        weeklyTrips: number;
        weeklyDistanceKm: number;
        previousScore: number;
      }> = [];

      let groupTotalDistance = 0;
      let groupTotalTrips = 0;
      let topSpeed = 0;
      let topSpeedDriver = '';

      for (const uid of memberUids) {
        const tripsSnap = await db
          .collection(`users/${uid}/trips`)
          .where('status', '==', 'completed')
          .where('startedAt', '>=', admin.firestore.Timestamp.fromMillis(weekAgo))
          .get();

        if (tripsSnap.empty) {
          memberStats.push({ uid, displayName: '', weeklyScore: 0, weeklyTrips: 0, weeklyDistanceKm: 0, previousScore: 0 });
          continue;
        }

        const trips = tripsSnap.docs.map((d) => d.data());
        const weeklyScore = Math.round(trips.reduce((s, t) => s + (t.driveScore ?? 0), 0) / trips.length);
        const weeklyDistanceKm = trips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
        const weekTopSpeed = Math.max(...trips.map((t) => t.topSpeedKmh ?? 0));

        if (weekTopSpeed > topSpeed) {
          topSpeed = weekTopSpeed;
          topSpeedDriver = uid;
        }

        groupTotalDistance += weeklyDistanceKm;
        groupTotalTrips += trips.length;

        // Get previous score
        const memberSnap = await db.doc(`groups/${groupId}/members/${uid}`).get();
        const previousScore = memberSnap.data()?.weeklyScore ?? 0;
        const displayName = memberSnap.data()?.displayName ?? 'Unbekannt';

        memberStats.push({ uid, displayName, weeklyScore, weeklyTrips: trips.length, weeklyDistanceKm, previousScore });

        // Update member doc
        await db.doc(`groups/${groupId}/members/${uid}`).update({
          weeklyScore,
          weeklyTrips: trips.length,
          weeklyDistanceKm,
        });
      }

      // Sort by weeklyScore for rankings
      const sorted = [...memberStats].sort((a, b) => b.weeklyScore - a.weeklyScore);
      const mostImproved = memberStats.reduce(
        (best, m) =>
          m.weeklyScore - m.previousScore > (best?.weeklyScore ?? 0) - (best?.previousScore ?? 0)
            ? m
            : best,
        memberStats[0],
      );

      const recapData = {
        weekId,
        groupId,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        members: sorted.map((m, i) => ({
          uid: m.uid,
          displayName: m.displayName,
          weeklyScore: m.weeklyScore,
          weeklyTrips: m.weeklyTrips,
          weeklyDistanceKm: m.weeklyDistanceKm,
          rank: i + 1,
          scoreDelta: m.weeklyScore - m.previousScore,
        })),
        totalGroupDistanceKm: groupTotalDistance,
        totalGroupTrips: groupTotalTrips,
        topSpeedKmh: topSpeed,
        topSpeedDriverUid: topSpeedDriver,
        mostImprovedUid: mostImproved?.uid ?? null,
      };

      await db.doc(`groups/${groupId}/recaps/${weekId}`).set(recapData);
      await db.doc(`groups/${groupId}`).update({
        'stats.weeklyRecapGeneratedAt': admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send push notifications
      const tokens: string[] = [];
      for (const uid of memberUids) {
        const snap = await db.doc(`users/${uid}`).get();
        const token = snap.data()?.fcmToken;
        if (token) tokens.push(token);
      }

      if (tokens.length > 0 && sorted.length > 0) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: {
            title: `${groupData.name} — Wöchentlicher Rückblick`,
            body: `🏆 ${sorted[0].displayName} ist diese Woche der beste Fahrer!`,
          },
          data: { type: 'weekly_recap', groupId, weekId },
        });
      }
    }
  },
);

function getWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
