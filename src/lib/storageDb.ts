// 100% Free, Zero-Configuration, Permanent Browser Database (IndexedDB + LocalStorage)
// No Firebase, No Cloud Billing, No Credit Card Required!

export class StorageDb {
  private dbName = 'taskflow_db';
  private dbVersion = 1;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: Map<string, Set<() => void>> = new Map();

  constructor() {
    this.initDb();
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      // Fallback for environments without IndexedDB
      return Promise.resolve(null as any);
    }

    this.dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = [
          'accounts',
          'users',
          'tasks',
          'comments',
          'teams',
          'teamMembers',
          'teamInvitations',
          'activity',
          'notifications',
          'usernames',
        ];
        stores.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage');
        resolve(null as any);
      };
    });

    return this.dbPromise;
  }

  // Fallback to localStorage if IndexedDB is blocked in private browsing
  private getLocalFallback<T>(storeName: string): Record<string, T> {
    try {
      const raw = localStorage.getItem(`tf_${storeName}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private setLocalFallback<T>(storeName: string, data: Record<string, T>): void {
    try {
      localStorage.setItem(`tf_${storeName}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage quota or access warning:', e);
    }
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.initDb();
    if (!db) {
      const store = this.getLocalFallback<T>(storeName);
      return store[id] || null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => {
          const fallback = this.getLocalFallback<T>(storeName);
          resolve(fallback[id] || null);
        };
      } catch {
        const fallback = this.getLocalFallback<T>(storeName);
        resolve(fallback[id] || null);
      }
    });
  }

  async list<T>(storeName: string): Promise<T[]> {
    const db = await this.initDb();
    if (!db) {
      const store = this.getLocalFallback<T>(storeName);
      return Object.values(store);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => {
          const results = req.result || [];
          if (results.length === 0) {
            // Check fallback in case migration occurred
            const fallback = this.getLocalFallback<T>(storeName);
            const fallbackItems = Object.values(fallback);
            if (fallbackItems.length > 0) {
              resolve(fallbackItems);
              return;
            }
          }
          resolve(results);
        };
        req.onerror = () => {
          const fallback = this.getLocalFallback<T>(storeName);
          resolve(Object.values(fallback));
        };
      } catch {
        const fallback = this.getLocalFallback<T>(storeName);
        resolve(Object.values(fallback));
      }
    });
  }

  async set<T extends { id?: string }>(storeName: string, id: string, data: T): Promise<void> {
    const item = { ...data, id };
    const db = await this.initDb();

    // Always mirror to localStorage as backup
    const fallback = this.getLocalFallback<T>(storeName);
    fallback[id] = item;
    this.setLocalFallback(storeName, fallback);

    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    this.notify(storeName);
  }

  async update<T>(storeName: string, id: string, partial: Partial<T>): Promise<void> {
    const existing = await this.get<any>(storeName, id);
    const updated = { ...(existing || {}), ...partial, id };
    await this.set(storeName, id, updated);
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.initDb();

    const fallback = this.getLocalFallback(storeName);
    delete fallback[id];
    this.setLocalFallback(storeName, fallback);

    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    this.notify(storeName);
  }

  async query<T>(storeName: string, predicate: (item: T) => boolean): Promise<T[]> {
    const all = await this.list<T>(storeName);
    return all.filter(predicate);
  }

  subscribe(storeName: string, listener: () => void): () => void {
    if (!this.listeners.has(storeName)) {
      this.listeners.set(storeName, new Set());
    }
    this.listeners.get(storeName)!.add(listener);

    return () => {
      this.listeners.get(storeName)?.delete(listener);
    };
  }

  private notify(storeName: string) {
    const set = this.listeners.get(storeName);
    if (set) {
      set.forEach((listener) => {
        try {
          listener();
        } catch (e) {
          console.warn('Listener error:', e);
        }
      });
    }
  }

  // Export full backup for user security and device migration
  async exportBackup(): Promise<string> {
    const stores = [
      'accounts',
      'users',
      'tasks',
      'comments',
      'teams',
      'teamMembers',
      'teamInvitations',
      'activity',
      'notifications',
    ];

    const backupData: Record<string, any[]> = {};
    for (const store of stores) {
      backupData[store] = await this.list(store);
    }

    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: backupData,
      },
      null,
      2
    );
  }

  // Import backup data
  async importBackup(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) return false;

      for (const [storeName, items] of Object.entries(parsed.data)) {
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id) {
              await this.set(storeName, item.id, item);
            }
          }
        }
      }
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }
}

export const storageDb = new StorageDb();

// Helper to generate consistent unique IDs
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// Timestamp helper
export function getIsoTimestamp(): string {
  return new Date().toISOString();
}
