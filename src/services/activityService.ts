import {
  collection,
  doc,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Activity, ActivityAction } from '../types';

export const activityService = {
  async getTeamActivity(teamId: string, limitCount = 25): Promise<Activity[]> {
    const colRef = collection(db, 'activity');
    try {
      const q = query(colRef, where('teamId', '==', teamId));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
      return items
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        })
        .slice(0, limitCount);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'activity');
    }
  },

  async getUserActivity(userId: string, limitCount = 25): Promise<Activity[]> {
    const colRef = collection(db, 'activity');
    try {
      const q = query(colRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
      return items
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        })
        .slice(0, limitCount);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'activity');
    }
  },

  async logActivity(data: {
    teamId: string;
    taskId?: string;
    userId: string;
    userName: string;
    userPhotoURL?: string;
    action: ActivityAction;
    details: string;
  }): Promise<string> {
    const actRef = doc(collection(db, 'activity'));
    try {
      await setDoc(actRef, {
        id: actRef.id,
        ...data,
        createdAt: serverTimestamp(),
      });
      return actRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `activity/${actRef.id}`);
    }
  },
};
