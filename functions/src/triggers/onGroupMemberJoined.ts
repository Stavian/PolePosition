import * as functions from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/** Notifies existing group members when a new member joins */
export const onGroupMemberJoined = functions.onDocumentCreated(
  'groups/{groupId}/members/{uid}',
  async (event) => {
    const { groupId, uid } = event.params;
    const memberData = event.data?.data();
    if (!memberData) return;

    const groupSnap = await db.doc(`groups/${groupId}`).get();
    const groupData = groupSnap.data();
    if (!groupData) return;

    const existingMemberUids: string[] = groupData.memberUids.filter((id: string) => id !== uid);
    if (existingMemberUids.length === 0) return;

    // Get FCM tokens of existing members
    const tokenDocs = await Promise.all(
      existingMemberUids.map((id) => db.doc(`users/${id}`).get()),
    );
    const tokens = tokenDocs
      .map((d) => d.data()?.fcmToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) return;

    await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: groupData.name,
        body: `${memberData.displayName} ist der Gruppe beigetreten!`,
      },
      data: { type: 'member_joined', groupId },
    });
  },
);
