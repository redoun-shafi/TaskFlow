import { storageDb, generateId, getIsoTimestamp } from '../lib/storageDb';
import { Task, TaskPriority, TaskStatus, Comment, TaskAttachment } from '../types';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

export const taskService = {
  async getTeamTasks(teamId: string): Promise<Task[]> {
    const tasks = await storageDb.query<Task>('tasks', (t) => t.teamId === teamId);
    return tasks.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  async getUserTasks(userId: string): Promise<Task[]> {
    const tasks = await storageDb.query<Task>(
      'tasks',
      (t) =>
        t.assigneeId === userId ||
        t.creatorId === userId ||
        (t.memberIds && t.memberIds.includes(userId)) ||
        t.teamId === 'personal'
    );

    return tasks.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  async getTask(taskId: string): Promise<Task | null> {
    return storageDb.get<Task>('tasks', taskId);
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
    const taskId = generateId('tsk');
    const now = getIsoTimestamp();

    const memberIds = Array.from(
      new Set([
        data.creator.uid,
        ...(data.assignee?.uid ? [data.assignee.uid] : []),
        ...(data.teamMemberIds || []),
      ])
    );

    const taskPayload: Task = {
      id: taskId,
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
      completedAt: data.status === 'COMPLETED' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('tasks', taskId, taskPayload);

    await activityService.logActivity({
      teamId: data.teamId,
      taskId,
      userId: data.creator.uid,
      userName: data.creator.displayName || 'User',
      action: 'TASK_CREATED',
      details: `Created task "${data.title.trim()}"`,
    });

    if (data.assignee?.uid && data.assignee.uid !== data.creator.uid) {
      await notificationService.sendNotification({
        userId: data.assignee.uid,
        title: 'Assigned to New Task',
        message: `${data.creator.displayName || 'Someone'} assigned you to "${data.title.trim()}".`,
        type: 'TASK_ASSIGNED',
        link: `/tasks/${taskId}`,
        metadata: { taskId, teamId: data.teamId },
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
    const now = getIsoTimestamp();
    const updatedPayload: any = {
      ...updates,
      updatedAt: now,
    };

    if (updates.status && updates.status !== existingTask.status) {
      if (updates.status === 'COMPLETED') {
        updatedPayload.completedAt = now;
      } else {
        updatedPayload.completedAt = null;
      }
    }

    await storageDb.update('tasks', taskId, updatedPayload);

    // Activity log
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
    await storageDb.delete('tasks', task.id);

    await activityService.logActivity({
      teamId: task.teamId,
      userId: actor.uid,
      userName: actor.displayName || 'User',
      action: 'TASK_COMPLETED',
      details: `Deleted task "${task.title}"`,
    });
  },

  async getTaskComments(taskId: string): Promise<Comment[]> {
    const comments = await storageDb.query<Comment>('comments', (c) => c.taskId === taskId);
    return comments.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
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
    const commentId = generateId('cmt');
    const now = getIsoTimestamp();

    const commentPayload: Comment = {
      id: commentId,
      taskId: data.taskId,
      teamId: data.teamId,
      authorId: data.author.uid,
      authorName: data.author.displayName || 'User',
      authorPhotoURL: data.author.photoURL || '',
      content: data.content.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('comments', commentId, commentPayload);

    await activityService.logActivity({
      teamId: data.teamId,
      taskId: data.taskId,
      userId: data.author.uid,
      userName: data.author.displayName || 'User',
      userPhotoURL: data.author.photoURL || undefined,
      action: 'COMMENT_ADDED',
      details: `Commented on "${data.taskTitle}"`,
    });

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
    await storageDb.delete('comments', commentId);
  },
};
