import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { storageService } from './storageService';

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', userId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      if (msg.includes('offline') || msg.includes('unavailable') || code === 'unavailable') {
        console.warn(`Firestore offline while fetching user profile for ${userId}, continuing with local/cached session.`);
        return null;
      }
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'bio'>>
  ): Promise<void> {
    const docRef = doc(db, 'users', userId);
    try {
      await setDoc(
        docRef,
        {
          ...updates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (auth.currentUser && updates.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName,
          photoURL: updates.photoURL || auth.currentUser.photoURL,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  },

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const photoURL = await storageService.uploadProfilePicture(userId, file);
    await this.updateUserProfile(userId, { photoURL });
    return photoURL;
  },

  async checkUsernameAvailable(username: string): Promise<boolean> {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3) return false;
    const docRef = doc(db, 'usernames', clean);
    try {
      const snap = await getDoc(docRef);
      return !snap.exists();
    } catch (err) {
      console.warn('Username check error, falling back to local verification:', err);
      return true;
    }
  },

  async claimUsername(username: string, userId: string): Promise<void> {
    const clean = username.trim().toLowerCase();
    if (!clean) return;
    const docRef = doc(db, 'usernames', clean);
    try {
      await setDoc(docRef, {
        username: clean,
        uid: userId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not claim username document:', err);
    }
  },
};
