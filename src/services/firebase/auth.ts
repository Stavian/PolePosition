import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './config';
import { userDoc } from './firestore';
import type { UserDocument } from '../../types/firestore';

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
): Promise<User> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await createUserDocument(cred.user, displayName);
  return cred.user;
};

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signInWithGoogle = async (idToken: string): Promise<User> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  await ensureUserDocument(cred.user);
  return cred.user;
};

export const signInWithApple = async (
  identityToken: string,
  nonce: string,
): Promise<User> => {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const cred = await signInWithCredential(auth, credential);
  await ensureUserDocument(cred.user);
  return cred.user;
};

export const signOutUser = () => signOut(auth);

export const resetPassword = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const onAuthChanged = (cb: (user: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// ─── User Document Helpers ────────────────────────────────────────────────────

const createUserDocument = async (user: User, displayName: string) => {
  const data: Omit<UserDocument, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    uid: user.uid,
    displayName,
    avatarUrl: user.photoURL,
    email: user.email ?? '',
    createdAt: serverTimestamp() as any,
    groupIds: [],
    fcmToken: null,
    unitPreference: 'kmh',
    privacySettings: { shareLocationWith: 'group' },
    stats: {
      totalTrips: 0,
      totalDistanceKm: 0,
      totalDrivingMinutes: 0,
      lifetimeDriveScore: 0,
      weeklyDriveScore: 0,
      monthlyDriveScore: 0,
      badgeIds: [],
    },
  };
  await setDoc(userDoc(user.uid), data as any);
};

const ensureUserDocument = async (user: User) => {
  // Cloud Function onCreate trigger also creates the doc; this is a client-side fallback
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(userDoc(user.uid));
  if (!snap.exists()) {
    await createUserDocument(user, user.displayName ?? user.email?.split('@')[0] ?? 'Fahrer');
  }
};
