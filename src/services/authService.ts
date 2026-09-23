import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

export const authService = {
  async register(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    await updateProfile(user, {
      displayName: displayName.trim(),
    });

    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        id: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not auto-send verification email:', e);
    }

    return user;
  },

  async registerWithEmail(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
    return this.register(email, pass, displayName);
  },

  async login(email: string, pass: string): Promise<FirebaseUser> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  async loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
    return this.login(email, pass);
  },

  async loginWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;

    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(
        userRef,
        {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }

    return user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  async sendVerification(): Promise<void> {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  },

  async sendEmailVerification(): Promise<void> {
    return this.sendVerification();
  },

  async updatePassword(newPass: string): Promise<void> {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, newPass);
    }
  },

  async updateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, updates);
    }
  },
};
