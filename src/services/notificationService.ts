import { storageDb, generateId, getIsoTimestamp } from '../lib/storageDb';
import { Notification, NotificationType } from '../types';

export const notificationService = {
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const items = await storageDb.query<Notification>('notifications', (n) => n.userId === userId);
    return items.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const id = generateId('notif');
    const notifPayload: Notification = {
      id,
      ...data,
      read: false,
      createdAt: getIsoTimestamp(),
    };
    await storageDb.set('notifications', id, notifPayload);
    return id;
  },

  async markAsRead(notificationId: string): Promise<void> {
    await storageDb.update<Notification>('notifications', notificationId, { read: true });
  },

  async markAllAsRead(userId: string): Promise<void> {
    const unread = await storageDb.query<Notification>(
      'notifications',
      (n) => n.userId === userId && !n.read
    );
    for (const item of unread) {
      await storageDb.update<Notification>('notifications', item.id, { read: true });
    }
  },
};
