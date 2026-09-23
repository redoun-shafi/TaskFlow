import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Users,
  Layers,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Comment, Activity } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { taskService } from '../../services/taskService';
import { activityService } from '../../services/activityService';
import { getPriorityBadge, getStatusBadge } from './TaskCard';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEditTask: (task: Task) => void;
  onTaskUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onEditTask,
  onTaskUpdated,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { teamMembers } = useTeam();

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (task && isOpen) {
      loadComments(task.id);
      loadActivity(task.teamId, task.id);
    }
  }, [task, isOpen]);

  const loadComments = async (taskId: string) => {
    setLoadingComments(true);
    try {
      const items = await taskService.getTaskComments(taskId);
      setComments(items);
    } catch (e) {
      console.warn('Could not load comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadActivity = async (teamId: string, taskId: string) => {
    try {
      const teamActs = await activityService.getTeamActivity(teamId, 50);
      setActivities(teamActs.filter((a) => a.taskId === taskId));
    } catch (e) {
      console.warn('Could not load activity:', e);
    }
  };

  if (!isOpen || !task) return null;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!currentUser) return;
    await taskService.updateTask(
      task.id,
      task,
      { status: newStatus },
      {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        photoURL: userProfile?.photoURL || currentUser.photoURL,
      }
    );
    onTaskUpdated();
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!currentUser) return;
    await taskService.updateTask(
      task.id,
      task,
      { priority: newPriority },
      {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        photoURL: userProfile?.photoURL || currentUser.photoURL,
      }
    );
    onTaskUpdated();
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!currentUser) return;
    const selected = teamMembers.find((m) => m.userId === newAssigneeId);
    await taskService.updateTask(
      task.id,
      task,
      {
        assigneeId: selected?.userId || null,
        assigneeName: selected?.userDisplayName || null,
        assigneeEmail: selected?.userEmail || null,
      },
      {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        photoURL: userProfile?.photoURL || currentUser.photoURL,
      }
    );
    onTaskUpdated();
  };

  const handlePhaseChange = async (newPhase: string) => {
    if (!currentUser) return;
    await taskService.updateTask(
      task.id,
      task,
      { phase: newPhase },
      {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
        photoURL: userProfile?.photoURL || currentUser.photoURL,
      }
    );
    onTaskUpdated();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;

    setSubmittingComment(true);
    try {
      const newComment = await taskService.addComment({
        taskId: task.id,
        taskTitle: task.title,
        teamId: task.teamId,
        author: {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName,
          photoURL: userProfile?.photoURL || currentUser.photoURL,
        },
        content: commentText.trim(),
        taskAssigneeId: task.assigneeId,
        taskCreatorId: task.creatorId,
      });
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      loadActivity(task.teamId, task.id);
    } catch (e) {
      console.error('Could not post comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await taskService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error('Could not delete comment:', e);
    }
  };

  const pBadge = getPriorityBadge(task.priority);
  const sBadge = getStatusBadge(task.status);
  const isOverdue =
    task.dueDate &&
    task.status !== 'COMPLETED' &&
    new Date(task.dueDate).setHours(23, 59, 59, 999) < Date.now();

  return (
    <div
      id="task-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="task-detail-modal-card"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${sBadge.bg}`}
            >
              {sBadge.label}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${pBadge.bg}`}
            >
              {pBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="edit-task-btn"
              type="button"
              onClick={() => onEditTask(task)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 text-xs font-semibold"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              id="close-task-detail-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title and Metadata Badges */}
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-snug">
              {task.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Created by {task.creatorName} ({task.creatorEmail})
            </p>

            {/* Visibility & Phase Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {task.isPrivate || task.teamId === 'personal' ? (
                <span
                  id="detail-task-private-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Private Task (Personal)</span>
                </span>
              ) : (
                <span
                  id="detail-task-team-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Shared with {task.teamName || 'Team'}</span>
                </span>
              )}

              {task.phase ? (
                <span
                  id="detail-task-phase-badge"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{task.phase}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>No Phase</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            {/* Status Change */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Status
              </span>
              <select
                id="detail-status-select"
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Priority Change */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Priority
              </span>
              <select
                id="detail-priority-select"
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Change */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Assignee
              </span>
              {task.isPrivate || task.teamId === 'personal' ? (
                <div className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 truncate flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>You (Personal)</span>
                </div>
              ) : (
                <select
                  id="detail-assignee-select"
                  value={task.assigneeId || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-800 truncate"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.userDisplayName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Due Date */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Due Date
              </span>
              <div
                className={`flex items-center gap-1 font-semibold text-xs py-1 ${
                  isOverdue ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                <span>{task.dueDate || 'No due date'}</span>
              </div>
            </div>

            {/* Phase Row in Grid */}
            <div className="col-span-2 sm:col-span-4 pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] uppercase font-bold text-slate-400">Phase:</span>
                <span className="text-xs font-semibold text-slate-800">{task.phase || 'General'}</span>
              </div>
              <select
                id="detail-phase-select"
                value={task.phase || ''}
                onChange={(e) => handlePhaseChange(e.target.value)}
                className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">No Phase (General)</option>
                <option value="Phase 1: Planning & Discovery">Phase 1: Planning & Discovery</option>
                <option value="Phase 2: Execution & Development">Phase 2: Execution & Development</option>
                <option value="Phase 3: Testing & Review">Phase 3: Testing & Review</option>
                <option value="Phase 4: Launch & Handover">Phase 4: Launch & Handover</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Description
            </h3>
            <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {task.description || (
                <span className="text-slate-400 italic">No description provided.</span>
              )}
            </div>
          </div>

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Labels
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {task.labels.map((lbl, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          {task.attachments && task.attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Attachments ({task.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all text-xs"
                  >
                    <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                    <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                      {Math.round(att.size / 1024)} KB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments ({comments.length})</span>
            </h3>

            {/* Comments List */}
            <div className="space-y-3 mb-4">
              {loadingComments ? (
                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading comments...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No comments yet. Start the conversation!</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {c.authorPhotoURL ? (
                          <img
                            src={c.authorPhotoURL}
                            alt={c.authorName}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-slate-800">{c.authorName}</span>
                      </div>
                      {c.authorId === currentUser?.uid && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-slate-700 pl-7 whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                id="task-comment-input"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <button
                id="submit-comment-btn"
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {submittingComment ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* Activity Logs */}
          {activities.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Recent Task Activity
              </h3>
              <div className="space-y-1.5">
                {activities.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="text-[11px] text-slate-500 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span className="font-semibold text-slate-700">{act.userName}:</span>
                    <span>{act.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
