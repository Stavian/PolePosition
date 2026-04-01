import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const MATCH_RADIUS_KM = 2;

/**
 * Finds group members who drove a similar route (same origin/destination within 2km radius).
 */
export const computeRouteMatch = functions.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.HttpsError('unauthenticated', 'Nicht angemeldet.');

  const { tripId, groupId } = request.data as { tripId: string; groupId: string };

  const tripSnap = await db.doc(`users/${uid}/trips/${tripId}`).get();
  if (!tripSnap.exists) throw new functions.HttpsError('not-found', 'Fahrt nicht gefunden.');
  const trip = tripSnap.data()!;

  if (!trip.originLat || !trip.destinationLat) {
    return { matches: [] };
  }

  // Get group members
  const groupSnap = await db.doc(`groups/${groupId}`).get();
  const memberUids: string[] = (groupSnap.data()?.memberUids ?? []).filter((id: string) => id !== uid);

  const matches: Array<{
    uid: string;
    displayName: string;
    tripId: string;
    durationMinutes: number;
    distanceKm: number;
    driveScore: number;
    topSpeedKmh: number;
    timeDeltaMinutes: number;
  }> = [];

  for (const friendUid of memberUids) {
    const friendTripsSnap = await db
      .collection(`users/${friendUid}/trips`)
      .where('status', '==', 'completed')
      .orderBy('startedAt', 'desc')
      .limit(30)
      .get();

    for (const doc of friendTripsSnap.docs) {
      const ft = doc.data();
      if (!ft.originLat || !ft.destinationLat) continue;

      const originDist = haversine(trip.originLat, trip.originLng, ft.originLat, ft.originLng);
      const destDist = haversine(trip.destinationLat, trip.destinationLng, ft.destinationLat, ft.destinationLng);

      if (originDist <= MATCH_RADIUS_KM && destDist <= MATCH_RADIUS_KM) {
        const userSnap = await db.doc(`users/${friendUid}`).get();
        const displayName = userSnap.data()?.displayName ?? 'Unbekannt';
        matches.push({
          uid: friendUid,
          displayName,
          tripId: ft.tripId,
          durationMinutes: ft.durationMinutes ?? 0,
          distanceKm: ft.distanceKm ?? 0,
          driveScore: ft.driveScore ?? 0,
          topSpeedKmh: ft.topSpeedKmh ?? 0,
          timeDeltaMinutes: (ft.durationMinutes ?? 0) - (trip.durationMinutes ?? 0),
        });
        break; // one match per friend is enough
      }
    }
  }

  return { matches };
});

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
