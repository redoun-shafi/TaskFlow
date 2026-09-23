import { storageDb, getIsoTimestamp } from '../lib/storageDb';
import { UserProfile } from '../types';
import { storageService } from './storageService';
import { authService } from './authService';

export const userService = {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    return storageDb.get<UserProfile>('users', userId);
  },

  async updateUserProfile(
    userId: string,
    updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'bio'>>
  ): Promise<void> {
    const existing = await storageDb.get<UserProfile>('users', userId);
    const updated: UserProfile = {
      ...(existing || {
        id: userId,
        email: '',
        displayName: 'User',
        createdAt: getIsoTimestamp(),
      }),
      ...updates,
      updatedAt: getIsoTimestamp(),
    };
    await storageDb.set('users', userId, updated);

    // Sync auth active session
    if (updates.displayName || updates.photoURL !== undefined) {
      await authService.updateUserProfile(updates);
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
    const users = await storageDb.list<UserProfile>('users');
    const match = users.find((u) => u.username?.toLowerCase() === clean);
    return !match;
  },

  async claimUsername(username: string, userId: string): Promise<void> {
    const clean = username.trim().toLowerCase();
    if (!clean) return;
    await storageDb.update<UserProfile>('users', userId, {
      username: clean,
      updatedAt: getIsoTimestamp(),
    });
  },
};
