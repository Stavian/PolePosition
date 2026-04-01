import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { randomBytes } from 'crypto';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Creates a new group with a unique 6-character invite code.
 * Called from the app via httpsCallable.
 */
export const createGroup = functions.onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.HttpsError('unauthenticated', 'Nicht angemeldet.');

  const { name } = request.data as { name: string };
  if (!name || name.trim().length === 0) {
    throw new functions.HttpsError('invalid-argument', 'Gruppenname fehlt.');
  }

  // Check user doesn't already have a group (optional, configurable)
  const userSnap = await db.doc(`users/${uid}`).get();
  const userData = userSnap.data();
  if (userData?.groupIds?.length >= 5) {
    throw new functions.HttpsError('resource-exhausted', 'Maximale Gruppenanzahl erreicht.');
  }

  // Generate unique 6-char invite code
  let code = '';
  let attempts = 0;
  while (attempts < 10) {
    code = randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
    const existing = await db.doc(`inviteCodes/${code}`).get();
    if (!existing.exists) break;
    attempts++;
  }
  if (!code) throw new functions.HttpsError('internal', 'Code-Generierung fehlgeschlagen.');

  const groupId = db.collection('groups').doc().id;
  const now = admin.firestore.FieldValue.serverTimestamp();

  const batch = db.batch();

  // Create group document
  batch.set(db.doc(`groups/${groupId}`), {
    groupId,
    name: name.trim(),
    createdBy: uid,
    createdAt: now,
    inviteCode: code,
    inviteCodeExpiresAt: null,
    memberUids: [uid],
    settings: { maxMembers: 50, allowMemberInvites: true },
    stats: {
      totalGroupTrips: 0,
      totalGroupDistanceKm: 0,
      topDriverUid: null,
      weeklyRecapGeneratedAt: null,
    },
  });

  // Create invite code index
  batch.set(db.doc(`inviteCodes/${code}`), {
    code,
    groupId,
    createdAt: now,
    expiresAt: null,
    usageCount: 0,
  });

  // Create member document
  batch.set(db.doc(`groups/${groupId}/members/${uid}`), {
    uid,
    displayName: userData?.displayName ?? 'Unbekannt',
    avatarUrl: userData?.avatarUrl ?? null,
    role: 'owner',
    joinedAt: now,
    weeklyScore: 0,
    monthlyScore: 0,
    allTimeScore: 0,
    weeklyTrips: 0,
    weeklyDistanceKm: 0,
  });

  // Add group to user's groupIds
  batch.update(db.doc(`users/${uid}`), {
    groupIds: admin.firestore.FieldValue.arrayUnion(groupId),
  });

  await batch.commit();

  return { groupId, inviteCode: code };
});
