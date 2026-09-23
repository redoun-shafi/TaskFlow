import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Notification, NotificationType } from '../types';

export const notificationService = {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const colRef = collection(db, 'notifications');
    try {
      // Query without composite ordering initially or simple where
      const q = query(colRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      // Sort in memory by createdAt descending
      return items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    }
  },

  async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const notifRef = doc(collection(db, 'notifications'));
    try {
      await setDoc(notifRef, {
        id: notifRef.id,
        ...data,
        read: false,
        createdAt: serverTimestamp(),
      });
      return notifRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `notifications/${notifRef.id}`);
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    const notifRef = doc(db, 'notifications', notificationId);
    try {
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    const colRef = collection(db, 'notifications');
    try {
      const q = query(colRef, where('userId', '==', userId), where('read', '==', false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  },
};
