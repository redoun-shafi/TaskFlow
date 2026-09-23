import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, ActiveSessionUser } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  provider?: 'password' | 'google';
}

interface AuthContextValue {
  currentUser: AppUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  userProfile: null,
  loading: true,
  refreshUserProfile: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncAuth = useCallback(async () => {
    const session = authService.getCurrentUser();
    if (session) {
      setCurrentUser(session);
      try {
        const profile = await userService.getUserProfile(session.uid);
        if (profile) {
          setUserProfile(profile);
        } else {
          setUserProfile({
            id: session.uid,
            email: session.email,
            displayName: session.displayName,
            photoURL: session.photoURL || undefined,
            createdAt: new Date().toISOString(),
          } as UserProfile);
        }
      } catch (e) {
        console.warn('Profile load note:', e);
      }
    } else {
      setCurrentUser(null);
      setUserProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    syncAuth();

    const handleAuthChange = () => {
      syncAuth();
    };

    window.addEventListener('taskflow-auth-changed', handleAuthChange);
    return () => {
      window.removeEventListener('taskflow-auth-changed', handleAuthChange);
    };
  }, [syncAuth]);

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      const profile = await userService.getUserProfile(currentUser.uid);
      if (profile) setUserProfile(profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        refreshUserProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
