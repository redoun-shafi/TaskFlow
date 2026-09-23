import React, { useState, useEffect } from 'react';
import { Settings, Save, Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { teamService } from '../../services/teamService';

interface TeamSettingsViewProps {
  onTeamDeleted?: () => void;
}

export const TeamSettingsView: React.FC<TeamSettingsViewProps> = ({ onTeamDeleted }) => {
  const { currentUser, userProfile } = useAuth();
  const { currentTeam, currentRole, refreshTeams } = useTeam();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTeam) {
      setName(currentTeam.name);
      setDescription(currentTeam.description || '');
      setSuccess(null);
      setError(null);
    }
  }, [currentTeam]);

  const isOwner = currentRole === 'OWNER';
  const isAdmin = currentRole === 'ADMIN' || isOwner;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam || !name.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await teamService.updateTeam(
        currentTeam.id,
        {
          name: name.trim(),
          description: description.trim(),
        }
      );
      setSuccess('Team settings updated successfully.');
      await refreshTeams();
    } catch (err: any) {
      setError(err?.message || 'Failed to update team settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam || !isOwner) return;
    const confirmName = prompt(
      `To confirm deletion, please type the workspace name "${currentTeam.name}":`
    );
    if (confirmName !== currentTeam.name) {
      alert('Workspace name does not match. Deletion cancelled.');
      return;
    }

    setDeleting(true);
    try {
      await teamService.deleteTeam(currentTeam.id);
      await refreshTeams();
      if (onTeamDeleted) onTeamDeleted();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete workspace');
      setDeleting(false);
    }
  };

  return (
    <div id="team-settings-view" className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Workspace Settings
            </h2>
            <p className="text-xs text-slate-500">
              Manage workspace details, branding, and permissions
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workspace Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="team-settings-name-input"
              type="text"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workspace Description
            </label>
            <textarea
              id="team-settings-desc-input"
              rows={3}
              disabled={!isAdmin}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Workspace ID
            </label>
            <input
              type="text"
              readOnly
              value={currentTeam?.id || ''}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono select-all"
            />
          </div>

          {isAdmin && (
            <div className="pt-2">
              <button
                id="save-team-settings-btn"
                type="submit"
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </form>

        {/* Danger Zone: Delete Team */}
        {isOwner && (
          <div className="border-t border-rose-100 pt-6 mt-6">
            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Delete this Workspace</span>
                </h4>
                <p className="text-[11px] text-rose-700 max-w-md">
                  Once deleted, all tasks, comments, and member associations in this workspace will be permanently removed.
                </p>
              </div>

              <button
                id="delete-team-btn"
                type="button"
                onClick={handleDeleteTeam}
                disabled={deleting}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
