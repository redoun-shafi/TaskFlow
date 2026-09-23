import { storageDb, generateId, getIsoTimestamp } from '../lib/storageDb';
import { Activity, ActivityAction } from '../types';

export const activityService = {
  async getTeamActivity(teamId: string, limitCount = 25): Promise<Activity[]> {
    const list = await storageDb.query<Activity>('activity', (a) => a.teamId === teamId);
    return list
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limitCount);
  },

  async getUserActivity(userId: string, limitCount = 25): Promise<Activity[]> {
    const list = await storageDb.query<Activity>('activity', (a) => a.userId === userId || a.teamId === 'personal');
    return list
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limitCount);
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
    const actId = generateId('act');
    const activityItem: Activity = {
      id: actId,
      ...data,
      createdAt: getIsoTimestamp(),
    };
    await storageDb.set('activity', actId, activityItem);
    return actId;
  },
};
