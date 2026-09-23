import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task, TaskPriority, TaskStatus, Comment, TaskAttachment } from '../types';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

export const taskService = {
  async getTeamTasks(teamId: string): Promise<Task[]> {
    const colRef = collection(db, 'tasks');
    try {
      const q = query(colRef, where('teamId', '==', teamId));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
      return items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tasks');
    }
  },

  async getUserTasks(userId: string): Promise<Task[]> {
    const colRef = collection(db, 'tasks');
    try {
      const map = new Map<string, Task>();

      try {
        const qAssignee = query(colRef, where('assigneeId', '==', userId));
        const snapAssignee = await getDocs(qAssignee);
        snapAssignee.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Task));
      } catch (e) {
        console.warn('Assignee query note:', e);
      }

      try {
        const qCreator = query(colRef, where('creatorId', '==', userId));
        const snapCreator = await getDocs(qCreator);
        snapCreator.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Task));
      } catch (e) {
        console.warn('Creator query note:', e);
      }

      try {
        const qMembers = query(colRef, where('teamMemberIds', 'array-contains', userId));
        const snapMembers = await getDocs(qMembers);
        snapMembers.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as Task));
      } catch (e) {
        console.warn('Members query note:', e);
      }

      return Array.from(map.values()).sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tasks');
    }
  },

  async getTask(taskId: string): Promise<Task | null> {
    const docRef = doc(db, 'tasks', taskId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Task;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `tasks/${taskId}`);
    }
  },

  async createTask(data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    teamId: string;
    teamName?: string;
    isPrivate?: boolean;
    phase?: string;
    creator: { uid: string; displayName: string | null; email: string | null };
    assignee?: { uid: string; displayName: string; email: string } | null;
    dueDate?: string;
    labels?: string[];
    attachments?: TaskAttachment[];
    teamMemberIds?: string[];
  }): Promise<Task> {
    const taskRef = doc(collection(db, 'tasks'));
    const memberIds = Array.from(
      new Set([
        data.creator.uid,
        ...(data.assignee?.uid ? [data.assignee.uid] : []),
        ...(data.teamMemberIds || []),
      ])
    );

    const taskPayload: Task = {
      id: taskRef.id,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      status: data.status,
      priority: data.priority,
      teamId: data.teamId,
      teamName: data.teamName || (data.teamId === 'personal' ? 'Personal' : undefined),
      isPrivate: data.isPrivate ?? (data.teamId === 'personal'),
      phase: data.phase?.trim() || '',
      creatorId: data.creator.uid,
      creatorName: data.creator.displayName || 'Creator',
      creatorEmail: data.creator.email || '',
      assigneeId: data.assignee?.uid || null,
      assigneeName: data.assignee?.displayName || null,
      assigneeEmail: data.assignee?.email || null,
      dueDate: data.dueDate || '',
      labels: data.labels || [],
      attachments: data.attachments || [],
      memberIds,
      completedAt: data.status === 'COMPLETED' ? serverTimestamp() : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(taskRef, taskPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `tasks/${taskRef.id}`);
    }

    await activityService.logActivity({
      teamId: data.teamId,
      taskId: taskRef.id,
      userId: data.creator.uid,
      userName: data.creator.displayName || 'Someone',
      action: 'TASK_CREATED',
      details: `Created task "${data.title.trim()}"`,
    });

    if (data.assignee?.uid && data.assignee.uid !== data.creator.uid) {
      await notificationService.sendNotification({
        userId: data.assignee.uid,
        title: 'Assigned to New Task',
        message: `${data.creator.displayName || 'A team member'} assigned you to "${data.title.trim()}".`,
        type: 'TASK_ASSIGNED',
        link: `/tasks/${taskRef.id}`,
        metadata: { taskId: taskRef.id, teamId: data.teamId },
      });
    }

    return taskPayload;
  },

  async updateTask(
    taskId: string,
    existingTask: Task,
    updates: Partial<Task>,
    actor: { uid: string; displayName: string | null; photoURL?: string | null }
  ): Promise<void> {
    const docRef = doc(db, 'tasks', taskId);
    const updatedPayload: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.status && updates.status !== existingTask.status) {
      if (updates.status === 'COMPLETED') {
        updatedPayload.completedAt = serverTimestamp();
      } else {
        updatedPayload.completedAt = null;
      }
    }

    try {
      await updateDoc(docRef, updatedPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
    }

    // Log Activity & Dispatch notifications
    if (updates.status && updates.status !== existingTask.status) {
      await activityService.logActivity({
        teamId: existingTask.teamId,
        taskId,
        userId: actor.uid,
        userName: actor.displayName || 'User',
        userPhotoURL: actor.photoURL || undefined,
        action: updates.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'STATUS_CHANGED',
        details: `Changed status to ${updates.status.replace('_', ' ')} on "${existingTask.title}"`,
      });
    }

    if (updates.priority && updates.priority !== existingTask.priority) {
      await activityService.logActivity({
        teamId: existingTask.teamId,
        taskId,
        userId: actor.uid,
        userName: actor.displayName || 'User',
        userPhotoURL: actor.photoURL || undefined,
        action: 'PRIORITY_CHANGED',
        details: `Updated priority to ${updates.priority} on "${existingTask.title}"`,
      });
    }

    if (
      updates.assigneeId !== undefined &&
      updates.assigneeId !== existingTask.assigneeId
    ) {
      await activityService.logActivity({
        teamId: existingTask.teamId,
        taskId,
        userId: actor.uid,
        userName: actor.displayName || 'User',
        userPhotoURL: actor.photoURL || undefined,
        action: 'TASK_ASSIGNED',
        details: updates.assigneeName
          ? `Assigned task "${existingTask.title}" to ${updates.assigneeName}`
          : `Unassigned task "${existingTask.title}"`,
      });

      if (updates.assigneeId && updates.assigneeId !== actor.uid) {
        await notificationService.sendNotification({
          userId: updates.assigneeId,
          title: 'Task Assigned',
          message: `${actor.displayName || 'Someone'} assigned you to "${existingTask.title}".`,
          type: 'TASK_ASSIGNED',
          link: `/tasks/${taskId}`,
          metadata: { taskId, teamId: existingTask.teamId },
        });
      }
    }
  },

  async deleteTask(task: Task, actor: { uid: string; displayName: string | null }): Promise<void> {
    const docRef = doc(db, 'tasks', task.id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${task.id}`);
    }

    await activityService.logActivity({
      teamId: task.teamId,
      userId: actor.uid,
      userName: actor.displayName || 'User',
      action: 'TASK_COMPLETED',
      details: `Deleted task "${task.title}"`,
    });
  },

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const colRef = collection(db, 'comments');
    try {
      const q = query(colRef, where('taskId', '==', taskId));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
      return items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeA - timeB; // Chronological
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'comments');
    }
  },

  async addComment(data: {
    taskId: string;
    taskTitle: string;
    teamId: string;
    author: { uid: string; displayName: string | null; photoURL: string | null };
    content: string;
    taskAssigneeId?: string | null;
    taskCreatorId: string;
  }): Promise<Comment> {
    const commentRef = doc(collection(db, 'comments'));
    const commentPayload: Comment = {
      id: commentRef.id,
      taskId: data.taskId,
      teamId: data.teamId,
      authorId: data.author.uid,
      authorName: data.author.displayName || 'User',
      authorPhotoURL: data.author.photoURL || '',
      content: data.content.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(commentRef, commentPayload);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `comments/${commentRef.id}`);
    }

    await activityService.logActivity({
      teamId: data.teamId,
      taskId: data.taskId,
      userId: data.author.uid,
      userName: data.author.displayName || 'User',
      userPhotoURL: data.author.photoURL || undefined,
      action: 'COMMENT_ADDED',
      details: `Commented on "${data.taskTitle}"`,
    });

    // Notify task assignee or creator if different from commenter
    const notifyTargets = new Set<string>();
    if (data.taskAssigneeId && data.taskAssigneeId !== data.author.uid) {
      notifyTargets.add(data.taskAssigneeId);
    }
    if (data.taskCreatorId && data.taskCreatorId !== data.author.uid) {
      notifyTargets.add(data.taskCreatorId);
    }

    for (const targetUid of notifyTargets) {
      await notificationService.sendNotification({
        userId: targetUid,
        title: 'New Comment on Task',
        message: `${data.author.displayName || 'Someone'} commented on "${data.taskTitle}".`,
        type: 'COMMENT_ADDED',
        link: `/tasks/${data.taskId}`,
        metadata: { taskId: data.taskId, teamId: data.teamId },
      });
    }

    return commentPayload;
  },

  async deleteComment(commentId: string): Promise<void> {
    const docRef = doc(db, 'comments', commentId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `comments/${commentId}`);
    }
  },
};
