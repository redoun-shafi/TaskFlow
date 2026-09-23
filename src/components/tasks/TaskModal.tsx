import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Tag,
  Paperclip,
  CheckCircle2,
  Trash2,
  Loader2,
  User,
  Lock,
  Users,
  Layers,
  Plus,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskAttachment, TeamMember } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { taskService } from '../../services/taskService';
import { teamService } from '../../services/teamService';
import { storageService } from '../../services/storageService';

export const WORKFLOW_PHASES = [
  'Phase 1: Planning & Discovery',
  'Phase 2: Execution & Development',
  'Phase 3: Testing & Review',
  'Phase 4: Launch & Handover',
] as const;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultStatus?: TaskStatus;
  defaultDueDate?: string;
  onTaskSaved: () => void;
  onTaskDeleted?: (task: Task) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultStatus = 'TODO',
  defaultDueDate = '',
  onTaskSaved,
  onTaskDeleted,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { teams, currentTeam, teamMembers, createTeam } = useTeam();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  
  // Visibility & Sharing state
  const [isPrivate, setIsPrivate] = useState<boolean>(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [showCreateTeamInline, setShowCreateTeamInline] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);

  // Phase state
  const [phase, setPhase] = useState<string>('');
  const [isCustomPhase, setIsCustomPhase] = useState<boolean>(false);
  const [customPhase, setCustomPhase] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setAssigneeId(taskToEdit.assigneeId || '');
      setDueDate(taskToEdit.dueDate || '');
      setLabels(taskToEdit.labels || []);
      setAttachments(taskToEdit.attachments || []);

      const priv =
        taskToEdit.isPrivate !== false &&
        (taskToEdit.teamId === 'personal' || !taskToEdit.teamId || taskToEdit.isPrivate === true);
      setIsPrivate(priv);
      setSelectedTeamId(
        !priv && taskToEdit.teamId !== 'personal'
          ? taskToEdit.teamId
          : currentTeam?.id || teams[0]?.id || ''
      );

      if (taskToEdit.phase) {
        if (WORKFLOW_PHASES.includes(taskToEdit.phase as any)) {
          setPhase(taskToEdit.phase);
          setIsCustomPhase(false);
          setCustomPhase('');
        } else {
          setPhase('CUSTOM');
          setIsCustomPhase(true);
          setCustomPhase(taskToEdit.phase);
        }
      } else {
        setPhase('');
        setIsCustomPhase(false);
        setCustomPhase('');
      }
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('MEDIUM');
      setAssigneeId('');
      setDueDate(defaultDueDate);
      setLabels([]);
      setAttachments([]);
      setIsPrivate(true);
      setSelectedTeamId(currentTeam?.id || teams[0]?.id || '');
      setPhase('');
      setIsCustomPhase(false);
      setCustomPhase('');
    }
    setShowCreateTeamInline(false);
    setNewTeamName('');
    setError(null);
  }, [taskToEdit, defaultStatus, defaultDueDate, isOpen, currentTeam, teams]);

  // Load team members when selected team changes
  useEffect(() => {
    if (!isPrivate && selectedTeamId) {
      let isMounted = true;
      teamService
        .getTeamMembers(selectedTeamId)
        .then((members) => {
          if (isMounted) setAvailableMembers(members);
        })
        .catch(() => {
          if (isMounted) setAvailableMembers(teamMembers);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setAvailableMembers([]);
    }
  }, [isPrivate, selectedTeamId, teamMembers]);

  if (!isOpen) return null;

  const handleAddLabel = () => {
    const trimmed = newLabelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setNewLabelInput('');
    }
  };

  const handleRemoveLabel = (tag: string) => {
    setLabels(labels.filter((l) => l !== tag));
  };

  const handleCreateTeamInline = async () => {
    if (!newTeamName.trim() || !currentUser) return;
    setCreatingTeam(true);
    try {
      const created = await createTeam(newTeamName.trim(), 'Shared task team workspace');
      setSelectedTeamId(created.id);
      setShowCreateTeamInline(false);
      setNewTeamName('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const uploadTeamId = !isPrivate && selectedTeamId ? selectedTeamId : 'personal';
      const placeholderTaskId = taskToEdit ? taskToEdit.id : `new_${Date.now()}`;
      const uploaded = await storageService.uploadTaskAttachment(
        uploadTeamId,
        placeholderTaskId,
        file
      );
      const newAtt: TaskAttachment = {
        id: `att_${Date.now()}`,
        name: uploaded.name,
        url: uploaded.url,
        size: uploaded.size,
        type: uploaded.type,
        uploadedAt: new Date().toISOString(),
      };
      setAttachments((prev) => [...prev, newAtt]);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload attachment');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title');
      return;
    }
    if (!currentUser) {
      setError('You must be signed in to manage tasks');
      return;
    }

    setSaving(true);
    setError(null);

    const effectivePhase = isCustomPhase
      ? customPhase.trim()
      : phase === 'CUSTOM'
      ? customPhase.trim()
      : phase;

    const chosenTeam = teams.find((t) => t.id === selectedTeamId);
    const effectiveTeamId = isPrivate ? 'personal' : selectedTeamId || currentTeam?.id || 'personal';
    const effectiveTeamName = isPrivate ? 'Personal' : chosenTeam?.name || currentTeam?.name || 'Team';

    const selectedAssignee = isPrivate
      ? {
          userId: currentUser.uid,
          userDisplayName: userProfile?.displayName || currentUser.displayName || 'Me',
          userEmail: currentUser.email || '',
        }
      : availableMembers?.find((m) => m.userId === assigneeId);

    try {
      if (taskToEdit) {
        await taskService.updateTask(
          taskToEdit.id,
          taskToEdit,
          {
            title: title.trim(),
            description: description.trim(),
            status,
            priority,
            isPrivate,
            teamId: effectiveTeamId,
            teamName: effectiveTeamName,
            phase: effectivePhase || '',
            assigneeId: isPrivate ? currentUser.uid : selectedAssignee?.userId || null,
            assigneeName: isPrivate
              ? userProfile?.displayName || currentUser.displayName || 'Me'
              : selectedAssignee?.userDisplayName || null,
            assigneeEmail: isPrivate ? currentUser.email || '' : selectedAssignee?.userEmail || null,
            dueDate,
            labels,
            attachments,
            memberIds: isPrivate ? [currentUser.uid] : chosenTeam?.memberIds || [currentUser.uid],
          },
          {
            uid: currentUser.uid,
            displayName: userProfile?.displayName || currentUser.displayName,
            photoURL: userProfile?.photoURL || currentUser.photoURL,
          }
        );
      } else {
        await taskService.createTask({
          title: title.trim(),
          description: description.trim(),
          status,
          priority,
          teamId: effectiveTeamId,
          teamName: effectiveTeamName,
          isPrivate,
          phase: effectivePhase,
          creator: {
            uid: currentUser.uid,
            displayName: userProfile?.displayName || currentUser.displayName,
            email: currentUser.email,
          },
          assignee: isPrivate
            ? {
                uid: currentUser.uid,
                displayName: userProfile?.displayName || currentUser.displayName || 'Me',
                email: currentUser.email || '',
              }
            : selectedAssignee
            ? {
                uid: selectedAssignee.userId,
                displayName: selectedAssignee.userDisplayName,
                email: selectedAssignee.userEmail,
              }
            : null,
          dueDate,
          labels,
          attachments,
          teamMemberIds: isPrivate ? [currentUser.uid] : chosenTeam?.memberIds || [currentUser.uid],
        });
      }

      onTaskSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || !currentUser) return;
    if (!window.confirm(`Are you sure you want to delete "${taskToEdit.title}"?`)) return;

    setSaving(true);
    try {
      await taskService.deleteTask(taskToEdit, {
        uid: currentUser.uid,
        displayName: userProfile?.displayName || currentUser.displayName,
      });
      if (onTaskDeleted) onTaskDeleted(taskToEdit);
      onTaskSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="task-modal-card"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            id="close-task-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Visibility: Private vs Team */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Task Visibility & Sharing <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="task-visibility-private-btn"
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  isPrivate
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    isPrivate ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Private Task</span>
                    {isPrivate && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Only visible to you (personal)
                  </p>
                </div>
              </button>

              <button
                id="task-visibility-team-btn"
                type="button"
                onClick={() => {
                  setIsPrivate(false);
                  if (!selectedTeamId && teams.length > 0) {
                    setSelectedTeamId(teams[0].id);
                  }
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                  !isPrivate
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    !isPrivate ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Share with Team</span>
                    {!isPrivate && <CheckCircle2 className="w-3 h-3 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Share with team members
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Which team to share with */}
          {!isPrivate && (
            <div
              id="team-selection-box"
              className="p-3.5 bg-slate-50 rounded-xl border border-indigo-100 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Select Team to Share With <span className="text-rose-500">*</span>
                  </span>
                </label>
                <button
                  id="toggle-create-team-btn"
                  type="button"
                  onClick={() => setShowCreateTeamInline(!showCreateTeamInline)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showCreateTeamInline ? 'Cancel' : 'New Team'}</span>
                </button>
              </div>

              {showCreateTeamInline ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="inline-team-name-input"
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team name (e.g. Core Engineering, Marketing)"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                    <button
                      id="create-team-inline-submit-btn"
                      type="button"
                      onClick={handleCreateTeamInline}
                      disabled={creatingTeam || !newTeamName.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition-colors"
                    >
                      {creatingTeam && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Create & Select</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Create a new collaborative workspace for your teammates.
                  </p>
                </div>
              ) : (
                <div>
                  {teams.length === 0 ? (
                    <div className="text-xs text-slate-500 py-1 flex items-center justify-between">
                      <span>No teams found yet.</span>
                      <button
                        type="button"
                        onClick={() => setShowCreateTeamInline(true)}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        + Create Your First Team
                      </button>
                    </div>
                  ) : (
                    <select
                      id="task-team-select"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.memberIds?.length || 1} members)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase System */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Task Phase</span>
              </label>
              <span className="text-[10px] text-slate-400">Workflow or lifecycle stage</span>
            </div>

            <div className="space-y-2">
              <select
                id="task-phase-select"
                value={isCustomPhase ? 'CUSTOM' : phase || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM') {
                    setIsCustomPhase(true);
                  } else {
                    setIsCustomPhase(false);
                    setPhase(val);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="">No Phase (General)</option>
                {WORKFLOW_PHASES.map((wp) => (
                  <option key={wp} value={wp}>
                    {wp}
                  </option>
                ))}
                <option value="CUSTOM">Custom Phase...</option>
              </select>

              {isCustomPhase && (
                <input
                  id="task-custom-phase-input"
                  type="text"
                  value={customPhase}
                  onChange={(e) => setCustomPhase(e.target.value)}
                  placeholder="Enter custom phase name (e.g. Sprint 2, Beta Testing, Discovery)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 animate-in fade-in duration-100"
                />
              )}

              {/* Quick phase chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Quick pick:</span>
                {['Planning', 'Execution', 'Review', 'Launch'].map((pLabel) => {
                  const matched = WORKFLOW_PHASES.find((wp) => wp.includes(pLabel));
                  const isSelected = phase.includes(pLabel) && !isCustomPhase;
                  return (
                    <button
                      key={pLabel}
                      type="button"
                      onClick={() => {
                        setIsCustomPhase(false);
                        setPhase(matched || pLabel);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finalize architectural blueprints"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="task-description-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, acceptance criteria, or notes..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all resize-none"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assignee
              </label>
              {isPrivate ? (
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>You (Personal task)</span>
                </div>
              ) : (
                <select
                  id="task-assignee-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                >
                  <option value="">Unassigned</option>
                  {availableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.userDisplayName} {m.userId === currentUser?.uid ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date
              </label>
              <input
                id="task-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Labels / Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Labels
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                id="task-new-label-input"
                type="text"
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                placeholder="Add tag and press Enter"
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddLabel}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Add
              </button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {labels.map((lbl) => (
                  <span
                    key={lbl}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    <span>{lbl}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(lbl)}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Attachments
              </label>
              <label className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>Upload file</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingAttachment}
                />
              </label>
            </div>

            {uploadingAttachment && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading file...
              </p>
            )}

            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                  >
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-indigo-600 hover:underline truncate max-w-[280px]"
                    >
                      {att.name}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments(attachments.filter((a) => a.id !== att.id))
                      }
                      className="text-slate-400 hover:text-rose-500 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            {taskToEdit ? (
              <button
                id="delete-task-modal-btn"
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="save-task-modal-btn"
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{taskToEdit ? 'Save Changes' : 'Create Task'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
