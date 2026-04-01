import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/** Joins a group using an invite code. */
export const joinGroup = functions.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.HttpsError('unauthenticated', 'Nicht angemeldet.');

  const { code } = request.data as { code: string };
  if (!code || code.trim().length !== 6) {
    throw new functions.HttpsError('invalid-argument', 'Ungültiger Einladungscode.');
  }

  const upperCode = code.trim().toUpperCase();
  const codeSnap = await db.doc(`inviteCodes/${upperCode}`).get();
  if (!codeSnap.exists) {
    throw new functions.HttpsError('not-found', 'Einladungscode nicht gefunden.');
  }

  const codeData = codeSnap.data()!;
  if (codeData.expiresAt && codeData.expiresAt.toMillis() < Date.now()) {
    throw new functions.HttpsError('deadline-exceeded', 'Einladungscode abgelaufen.');
  }

  const groupId: string = codeData.groupId;
  const groupSnap = await db.doc(`groups/${groupId}`).get();
  if (!groupSnap.exists) {
    throw new functions.HttpsError('not-found', 'Gruppe nicht gefunden.');
  }

  const groupData = groupSnap.data()!;
  if (groupData.memberUids.includes(uid)) {
    return { groupId }; // Already a member, no-op
  }

  if (groupData.memberUids.length >= (groupData.settings?.maxMembers ?? 50)) {
    throw new functions.HttpsError('resource-exhausted', 'Gruppe ist voll.');
  }

  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data();
  const now = admin.firestore.FieldValue.serverTimestamp();

  const batch = db.batch();

  batch.update(db.doc(`groups/${groupId}`), {
    memberUids: admin.firestore.FieldValue.arrayUnion(uid),
  });

  batch.set(db.doc(`groups/${groupId}/members/${uid}`), {
    uid,
    displayName: userData?.displayName ?? 'Unbekannt',
    avatarUrl: userData?.avatarUrl ?? null,
    role: 'member',
    joinedAt: now,
    weeklyScore: 0,
    monthlyScore: 0,
    allTimeScore: 0,
    weeklyTrips: 0,
    weeklyDistanceKm: 0,
  });

  batch.update(db.doc(`users/${uid}`), {
    groupIds: admin.firestore.FieldValue.arrayUnion(groupId),
  });

  batch.update(db.doc(`inviteCodes/${upperCode}`), {
    usageCount: admin.firestore.FieldValue.increment(1),
  });

  await batch.commit();

  return { groupId };
});
