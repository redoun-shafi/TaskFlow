export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  bio?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  userPhotoURL?: string;
  role: TeamRole;
  joinedAt?: any;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt?: any;
  updatedAt?: any;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  teamId: string;
  teamName?: string;
  isPrivate?: boolean;
  phase?: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  dueDate?: string; // YYYY-MM-DD
  labels?: string[];
  attachments?: TaskAttachment[];
  memberIds?: string[];
  completedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface Comment {
  id: string;
  taskId: string;
  teamId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt?: any;
  updatedAt?: any;
}

export type NotificationType =
  | 'TEAM_INVITE'
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'COMMENT_ADDED'
  | 'TEAM_JOINED';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt?: any;
}

export type ActivityAction =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'TASK_COMPLETED'
  | 'MEMBER_JOINED'
  | 'MEMBER_REMOVED'
  | 'COMMENT_ADDED';

export interface Activity {
  id: string;
  teamId: string;
  taskId?: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  action: ActivityAction;
  details: string;
  createdAt?: any;
}
