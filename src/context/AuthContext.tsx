import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isInstantSession?: boolean;
}

interface AuthContextValue {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  loginWithInstantSession: (data: {
    email: string;
    displayName: string;
    username?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {},
  loginWithInstantSession: async () => {},
  logout: async () => {},
});

const INSTANT_SESSION_KEY = 'taskflow_active_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string, fallbackUser?: AppUser | null) => {
    try {
      const profile = await userService.getUserProfile(uid);
      if (profile) {
        setUserProfile(profile);
      } else {
        const active = fallbackUser || currentUser;
        if (active) {
          setUserProfile({
            id: active.uid,
            email: active.email || '',
            displayName: active.displayName || 'User',
            username: active.email?.split('@')[0] || 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as UserProfile);
        }
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
      const active = fallbackUser || currentUser;
      if (active) {
        setUserProfile({
          id: active.uid,
          email: active.email || '',
          displayName: active.displayName || 'User',
          username: active.email?.split('@')[0] || 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as UserProfile);
      }
    }
  }, [currentUser]);

  const syncAuthState = useCallback(async () => {
    if (auth.currentUser) {
      const fbUser = auth.currentUser;
      localStorage.removeItem(INSTANT_SESSION_KEY);
      const userObj: AppUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
        emailVerified: fbUser.emailVerified,
        isInstantSession: false,
      };
      setCurrentUser(userObj);
      await fetchProfile(fbUser.uid, userObj);
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(INSTANT_SESSION_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        await fetchProfile(parsed.uid, parsed);
      } catch (e) {
        console.warn('Invalid stored session:', e);
        localStorage.removeItem(INSTANT_SESSION_KEY);
        setCurrentUser(null);
        setUserProfile(null);
      }
    } else {
      setCurrentUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      syncAuthState();
    });

    const handleCustomAuthChange = () => {
      syncAuthState();
    };

    window.addEventListener('taskflow-auth-changed', handleCustomAuthChange);

    // Initial check
    syncAuthState();

    return () => {
      unsubscribe();
      window.removeEventListener('taskflow-auth-changed', handleCustomAuthChange);
    };
  }, [syncAuthState]);

  const loginWithInstantSession = async (data: {
    email: string;
    displayName: string;
    username?: string;
  }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    const hash = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const uid = `usr_${hash}_${Date.now().toString(36).slice(-4)}`;

    const userObj: AppUser = {
      uid,
      email: cleanEmail,
      displayName: data.displayName.trim(),
      photoURL: null,
      emailVerified: true,
      isInstantSession: true,
    };

    localStorage.setItem(INSTANT_SESSION_KEY, JSON.stringify(userObj));
    setCurrentUser(userObj);

    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(
        userRef,
        {
          id: uid,
          email: cleanEmail,
          displayName: data.displayName.trim(),
          username: (data.username || cleanEmail.split('@')[0]).toLowerCase().trim(),
          photoURL: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      if (data.username) {
        await userService.claimUsername(data.username, uid);
      }

      await fetchProfile(uid, userObj);
    } catch (err) {
      console.warn('Could not sync user to Firestore:', err);
    }
  };

  const logout = async () => {
    localStorage.removeItem(INSTANT_SESSION_KEY);
    setCurrentUser(null);
    setUserProfile(null);
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Firebase logout notice:', e);
    }
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        refreshUserProfile,
        loginWithInstantSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
