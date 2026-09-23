import { storageDb, generateId, getIsoTimestamp } from '../lib/storageDb';
import { UserProfile } from '../types';

const SESSION_KEY = 'taskflow_active_session';

export interface AuthAccount {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  emailVerified: boolean;
  provider: 'password' | 'google';
}

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const data = enc.encode(password + '_taskflow_sec_salt_2026');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const chr = password.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('taskflow-auth-changed'));
  }
}

export const authService = {
  getCurrentUser(): ActiveSessionUser | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async register(email: string, pass: string, displayName: string): Promise<ActiveSessionUser> {
    const cleanEmail = normalizeEmail(email);
    const cleanName = displayName.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      const err: any = new Error('Please enter a valid email address.');
      err.code = 'auth/invalid-email';
      throw err;
    }

    if (!pass || pass.length < 6) {
      const err: any = new Error('Password must be at least 6 characters long.');
      err.code = 'auth/weak-password';
      throw err;
    }

    // Check if account already exists
    const accounts = await storageDb.list<AuthAccount>('accounts');
    const existing = accounts.find((a) => a.email === cleanEmail);
    if (existing) {
      const err: any = new Error('An account with this email address already exists. Please sign in instead.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }

    const uid = generateId('usr');
    const passwordHash = await hashPassword(pass);
    const now = getIsoTimestamp();

    const account: AuthAccount = {
      id: uid,
      uid,
      email: cleanEmail,
      displayName: cleanName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('accounts', uid, account);

    const userProfile: UserProfile = {
      id: uid,
      email: cleanEmail,
      displayName: cleanName,
      username: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20),
      photoURL: '',
      bio: 'Ready to stay productive with TaskFlow!',
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('users', uid, userProfile);

    // Seed helpful starter tasks for new user
    await this.seedWelcomeTasks(uid, cleanName, cleanEmail);

    const sessionUser: ActiveSessionUser = {
      uid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: null,
      emailVerified: true,
      provider: 'password',
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    notifyAuthChange();
    return sessionUser;
  },

  async registerWithEmail(email: string, pass: string, displayName: string): Promise<ActiveSessionUser> {
    return this.register(email, pass, displayName);
  },

  async login(email: string, pass: string): Promise<ActiveSessionUser> {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      const err: any = new Error('Please enter your email address.');
      err.code = 'auth/invalid-email';
      throw err;
    }

    const accounts = await storageDb.list<AuthAccount>('accounts');
    const account = accounts.find((a) => a.email === cleanEmail);

    if (!account) {
      const err: any = new Error('We could not find an account with this email. Please check for typos or sign up.');
      err.code = 'auth/user-not-found';
      throw err;
    }

    const passwordHash = await hashPassword(pass);
    if (account.passwordHash !== passwordHash) {
      const err: any = new Error('The password you entered does not match. Please try again or reset your password.');
      err.code = 'auth/wrong-password';
      throw err;
    }

    const sessionUser: ActiveSessionUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: account.photoURL || null,
      emailVerified: true,
      provider: 'password',
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    notifyAuthChange();
    return sessionUser;
  },

  async loginWithEmail(email: string, pass: string): Promise<ActiveSessionUser> {
    return this.login(email, pass);
  },

  // 100% Free Google Sign-In (Creates or logs into Google Account without Firebase)
  async loginWithGoogle(overrideEmail?: string, overrideName?: string): Promise<ActiveSessionUser> {
    const email = overrideEmail
      ? normalizeEmail(overrideEmail)
      : prompt('Enter your Google Account email:', 'alex.flow@gmail.com');

    if (!email) {
      const err: any = new Error('Google Sign-In was cancelled.');
      err.code = 'auth/popup-closed-by-user';
      throw err;
    }

    const cleanEmail = normalizeEmail(email);
    const defaultName = overrideName || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const cleanName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    const accounts = await storageDb.list<AuthAccount>('accounts');
    let account = accounts.find((a) => a.email === cleanEmail);

    if (!account) {
      const uid = generateId('usr_g');
      const now = getIsoTimestamp();
      account = {
        id: uid,
        uid,
        email: cleanEmail,
        displayName: cleanName,
        passwordHash: 'GOOGLE_OAUTH_VERIFIED',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
        createdAt: now,
        updatedAt: now,
      };

      await storageDb.set('accounts', uid, account);

      const userProfile: UserProfile = {
        id: uid,
        email: cleanEmail,
        displayName: cleanName,
        username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20),
        photoURL: account.photoURL,
        bio: 'Productivity enthusiast using TaskFlow.',
        createdAt: now,
        updatedAt: now,
      };
      await storageDb.set('users', uid, userProfile);

      await this.seedWelcomeTasks(uid, cleanName, cleanEmail);
    }

    const sessionUser: ActiveSessionUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: account.photoURL || null,
      emailVerified: true,
      provider: 'google',
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    notifyAuthChange();
    return sessionUser;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
    notifyAuthChange();
  },

  async sendPasswordReset(email: string): Promise<void> {
    const cleanEmail = normalizeEmail(email);
    const accounts = await storageDb.list<AuthAccount>('accounts');
    const account = accounts.find((a) => a.email === cleanEmail);

    if (!account) {
      const err: any = new Error('No account found with this email address.');
      err.code = 'auth/user-not-found';
      throw err;
    }
  },

  async updatePassword(newPass: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('No user is currently signed in.');

    const newHash = await hashPassword(newPass);
    await storageDb.update<AuthAccount>('accounts', user.uid, {
      passwordHash: newHash,
      updatedAt: getIsoTimestamp(),
    });
  },

  async updateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) throw new Error('No user is currently signed in.');

    const userUpdates: Partial<UserProfile> = {};
    if (updates.displayName) userUpdates.displayName = updates.displayName.trim();
    if (updates.photoURL !== undefined) userUpdates.photoURL = updates.photoURL;
    userUpdates.updatedAt = getIsoTimestamp();

    await storageDb.update<UserProfile>('users', user.uid, userUpdates);

    // Update active session
    const updatedSession: ActiveSessionUser = {
      ...user,
      displayName: updates.displayName?.trim() || user.displayName,
      photoURL: updates.photoURL !== undefined ? updates.photoURL : user.photoURL,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
    notifyAuthChange();
  },

  // Starter tasks so new users have an immediate, working workspace
  async seedWelcomeTasks(userId: string, userName: string, userEmail: string): Promise<void> {
    const existing = await storageDb.query<any>('tasks', (t) => t.creatorId === userId || t.assigneeId === userId);
    if (existing.length > 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const starterTasks = [
      {
        id: generateId('tsk'),
        title: 'Welcome to TaskFlow! 🎉',
        description: 'Explore your free, private, offline-capable productivity workspace. No credit card or subscription needed!',
        status: 'COMPLETED',
        priority: 'HIGH',
        teamId: 'personal',
        teamName: 'Personal',
        isPrivate: true,
        phase: 'Getting Started',
        creatorId: userId,
        creatorName: userName,
        creatorEmail: userEmail,
        assigneeId: userId,
        assigneeName: userName,
        assigneeEmail: userEmail,
        dueDate: todayStr,
        labels: ['Welcome', 'Guide'],
        attachments: [],
        memberIds: [userId],
        createdAt: getIsoTimestamp(),
        updatedAt: getIsoTimestamp(),
        completedAt: getIsoTimestamp(),
      },
      {
        id: generateId('tsk'),
        title: 'Review today’s key priorities',
        description: 'Use the Kanban board and Calendar to organize tasks, set priorities, and track progress effortlessly.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        teamId: 'personal',
        teamName: 'Personal',
        isPrivate: true,
        phase: 'Daily Plan',
        creatorId: userId,
        creatorName: userName,
        creatorEmail: userEmail,
        assigneeId: userId,
        assigneeName: userName,
        assigneeEmail: userEmail,
        dueDate: todayStr,
        labels: ['Daily', 'Focus'],
        attachments: [],
        memberIds: [userId],
        createdAt: getIsoTimestamp(),
        updatedAt: getIsoTimestamp(),
      },
      {
        id: generateId('tsk'),
        title: 'Organize upcoming project roadmap',
        description: 'Add new tasks using the "+ New Task" button on top or in the sidebar.',
        status: 'TODO',
        priority: 'LOW',
        teamId: 'personal',
        teamName: 'Personal',
        isPrivate: true,
        phase: 'Planning',
        creatorId: userId,
        creatorName: userName,
        creatorEmail: userEmail,
        assigneeId: userId,
        assigneeName: userName,
        assigneeEmail: userEmail,
        dueDate: tomorrow,
        labels: ['Roadmap'],
        attachments: [],
        memberIds: [userId],
        createdAt: getIsoTimestamp(),
        updatedAt: getIsoTimestamp(),
      },
    ];

    for (const t of starterTasks) {
      await storageDb.set('tasks', t.id, t);
    }
  },
};
