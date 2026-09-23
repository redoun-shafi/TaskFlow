import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Mail,
  Check,
  X,
  LogOut,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { teamService } from '../../services/teamService';
import { TeamRole } from '../../types';

export const TeamMembersView: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const {
    currentTeam,
    currentRole,
    teamMembers,
    invitations,
    acceptInvitation,
    rejectInvitation,
    refreshTeams,
  } = useTeam();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwner = currentRole === 'OWNER';
  const isAdmin = currentRole === 'ADMIN' || isOwner;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentTeam || !currentUser) return;

    setInviting(true);
    setError(null);
    setInviteSuccess(null);

    try {
      await teamService.inviteMember(
        currentTeam.id,
        currentTeam.name,
        {
          uid: currentUser.uid,
          displayName: userProfile?.displayName || currentUser.displayName,
        },
        inviteEmail.trim(),
        inviteRole
      );
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
    } catch (err: any) {
      setError(err?.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberUserId: string, newRole: TeamRole) => {
    if (!currentTeam) return;
    setActionLoading(memberUserId);
    try {
      await teamService.updateMemberRole(currentTeam.id, memberUserId, newRole);
      await refreshTeams();
    } catch (err: any) {
      setError(err?.message || 'Failed to update member role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!currentTeam || !currentUser) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;

    setActionLoading(memberUserId);
    try {
      await teamService.removeMember(
        currentTeam.id,
        memberUserId,
        userProfile?.displayName || currentUser.displayName || 'Admin',
        memberName
      );
      await refreshTeams();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveTeam = async () => {
    if (!currentTeam || !currentUser) return;
    if (isOwner && teamMembers.length > 1) {
      alert('As team owner, please transfer ownership before leaving the team.');
      return;
    }
    if (!window.confirm(`Are you sure you want to leave ${currentTeam.name}?`)) return;

    setActionLoading('leave');
    try {
      await teamService.leaveTeam(
        currentTeam.id,
        currentUser.uid,
        userProfile?.displayName || currentUser.displayName || 'User'
      );
      await refreshTeams();
    } catch (err: any) {
      setError(err?.message || 'Failed to leave team');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div id="team-members-view" className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Pending Invitations Received Section */}
      {invitations.length > 0 && (
        <div
          id="pending-invitations-banner"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Mail className="w-4 h-4 text-amber-600" />
            <span>Pending Team Invitations ({invitations.length})</span>
          </div>

          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-3 rounded-lg border border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    Workspace: <span className="text-indigo-600">{inv.teamName}</span>
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Invited by {inv.inviterName} as <span className="font-semibold">{inv.role}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`accept-invite-${inv.id}`}
                    type="button"
                    onClick={() => acceptInvitation(inv)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    id={`reject-invite-${inv.id}`}
                    type="button"
                    onClick={() => rejectInvitation(inv)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Team Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              {currentTeam?.name.charAt(0).toUpperCase() || 'W'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {currentTeam?.name || 'Workspace'} Members
              </h2>
              <p className="text-xs text-slate-500">
                {teamMembers.length} active member{teamMembers.length > 1 ? 's' : ''} &bull; Your role: <span className="font-semibold text-indigo-600">{currentRole}</span>
              </p>
            </div>
          </div>

          {!isOwner && (
            <button
              id="leave-team-btn"
              type="button"
              onClick={handleLeaveTeam}
              disabled={actionLoading === 'leave'}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Team</span>
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}
        {inviteSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{inviteSuccess}</span>
          </div>
        )}

        {/* Invite Form (Admins / Owners only) */}
        {isAdmin && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>Invite Teammate by Email</span>
            </div>

            <form onSubmit={handleInvite} className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                id="invite-email-input"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
              <select
                id="invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                id="send-invite-btn"
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
              >
                {inviting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Invitation</span>
              </button>
            </form>
          </div>
        )}

        {/* Members Table */}
        <div className="overflow-hidden border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamMembers.map((member) => {
                const isMe = member.userId === currentUser?.uid;
                const memberIsOwner = member.role === 'OWNER';

                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {member.userPhotoURL ? (
                          <img
                            src={member.userPhotoURL}
                            alt={member.userDisplayName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                            {member.userDisplayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{member.userDisplayName}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 text-slate-600 font-medium">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">{member.userEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge or dropdown */}
                    <td className="py-3 px-4">
                      {isOwner && !memberIsOwner ? (
                        <select
                          value={member.role}
                          disabled={actionLoading === member.userId}
                          onChange={(e) =>
                            handleRoleChange(member.userId, e.target.value as TeamRole)
                          }
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-700"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            member.role === 'OWNER'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : member.role === 'ADMIN'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {member.role}
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3 px-4 text-right">
                      {isAdmin && !memberIsOwner && !isMe ? (
                        <button
                          type="button"
                          disabled={actionLoading === member.userId}
                          onClick={() =>
                            handleRemoveMember(member.userId, member.userDisplayName)
                          }
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors"
                          title="Remove from team"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
