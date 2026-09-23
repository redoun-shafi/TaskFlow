import { storageDb, generateId, getIsoTimestamp } from '../lib/storageDb';
import { Team, TeamMember, TeamInvitation, TeamRole, UserProfile } from '../types';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

export const teamService = {
  async getUserTeams(userId: string): Promise<Team[]> {
    const teams = await storageDb.query<Team>(
      'teams',
      (t) => t.ownerId === userId || (t.memberIds && t.memberIds.includes(userId))
    );
    return teams;
  },

  async getTeam(teamId: string): Promise<Team | null> {
    return storageDb.get<Team>('teams', teamId);
  },

  async createTeam(
    name: string,
    description: string,
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ): Promise<Team> {
    const teamId = generateId('team');
    const now = getIsoTimestamp();

    const teamData: Team = {
      id: teamId,
      name: name.trim(),
      description: description.trim(),
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('teams', teamId, teamData);

    // Create TeamMember record
    const memberId = `${teamId}_${user.uid}`;
    const memberData: TeamMember = {
      id: memberId,
      teamId,
      userId: user.uid,
      userEmail: user.email || '',
      userDisplayName: user.displayName || 'Owner',
      userPhotoURL: user.photoURL || '',
      role: 'OWNER' as TeamRole,
      joinedAt: now,
    };
    await storageDb.set('teamMembers', memberId, memberData);

    await activityService.logActivity({
      teamId,
      userId: user.uid,
      userName: user.displayName || 'Owner',
      userPhotoURL: user.photoURL || '',
      action: 'MEMBER_JOINED',
      details: `Created team workspace "${name.trim()}"`,
    });

    return teamData;
  },

  async updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'description'>>): Promise<void> {
    await storageDb.update('teams', teamId, {
      ...updates,
      updatedAt: getIsoTimestamp(),
    });
  },

  async deleteTeam(teamId: string): Promise<void> {
    await storageDb.delete('teams', teamId);
    const members = await storageDb.query<TeamMember>('teamMembers', (m) => m.teamId === teamId);
    for (const m of members) {
      await storageDb.delete('teamMembers', m.id);
    }
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return storageDb.query<TeamMember>('teamMembers', (m) => m.teamId === teamId);
  },

  async inviteMember(
    teamId: string,
    teamName: string,
    inviter: { uid: string; displayName: string | null },
    inviteeEmail: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<string> {
    const normalizedEmail = inviteeEmail.trim().toLowerCase();
    const invId = generateId('inv');
    const now = getIsoTimestamp();

    const invData: TeamInvitation = {
      id: invId,
      teamId,
      teamName,
      inviterId: inviter.uid,
      inviterName: inviter.displayName || 'Team Member',
      inviteeEmail: normalizedEmail,
      role,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    await storageDb.set('teamInvitations', invId, invData);

    // Notify user if already registered
    const users = await storageDb.list<UserProfile>('users');
    const recipient = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (recipient) {
      await notificationService.sendNotification({
        userId: recipient.id,
        title: 'New Team Invitation',
        message: `${inviter.displayName || 'Someone'} invited you to join "${teamName}" as ${role}.`,
        type: 'TEAM_INVITE',
        link: '/teams',
        metadata: { teamId, invitationId: invId },
      });
    }

    return invId;
  },

  async getPendingInvitationsForEmail(email: string): Promise<TeamInvitation[]> {
    const normalizedEmail = email.trim().toLowerCase();
    return storageDb.query<TeamInvitation>(
      'teamInvitations',
      (inv) => inv.inviteeEmail === normalizedEmail && inv.status === 'PENDING'
    );
  },

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    return storageDb.query<TeamInvitation>('teamInvitations', (inv) => inv.teamId === teamId);
  },

  async respondToInvitation(
    invitation: TeamInvitation,
    accept: boolean,
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ): Promise<void> {
    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';
    await storageDb.update<TeamInvitation>('teamInvitations', invitation.id, {
      status: newStatus,
      updatedAt: getIsoTimestamp(),
    });

    if (accept) {
      const team = await storageDb.get<Team>('teams', invitation.teamId);
      if (team) {
        const memberIds = Array.from(new Set([...(team.memberIds || []), user.uid]));
        await storageDb.update('teams', invitation.teamId, {
          memberIds,
          updatedAt: getIsoTimestamp(),
        });
      }

      const memberId = `${invitation.teamId}_${user.uid}`;
      const memberData: TeamMember = {
        id: memberId,
        teamId: invitation.teamId,
        userId: user.uid,
        userEmail: user.email || '',
        userDisplayName: user.displayName || 'Member',
        userPhotoURL: user.photoURL || '',
        role: invitation.role,
        joinedAt: getIsoTimestamp(),
      };
      await storageDb.set('teamMembers', memberId, memberData);

      await activityService.logActivity({
        teamId: invitation.teamId,
        userId: user.uid,
        userName: user.displayName || 'Member',
        userPhotoURL: user.photoURL || '',
        action: 'MEMBER_JOINED',
        details: `Joined the team as ${invitation.role}`,
      });

      await notificationService.sendNotification({
        userId: invitation.inviterId,
        title: 'Invitation Accepted',
        message: `${user.displayName || user.email} accepted the invitation to "${invitation.teamName}".`,
        type: 'TEAM_JOINED',
        link: `/teams/${invitation.teamId}/members`,
        metadata: { teamId: invitation.teamId },
      });
    }
  },

  async updateMemberRole(teamId: string, memberUserId: string, newRole: TeamRole): Promise<void> {
    const memberId = `${teamId}_${memberUserId}`;
    await storageDb.update<TeamMember>('teamMembers', memberId, { role: newRole });
  },

  async removeMember(
    teamId: string,
    memberUserId: string,
    removerName: string,
    memberDisplayName: string
  ): Promise<void> {
    const memberId = `${teamId}_${memberUserId}`;
    await storageDb.delete('teamMembers', memberId);

    const team = await storageDb.get<Team>('teams', teamId);
    if (team) {
      const memberIds = (team.memberIds || []).filter((id) => id !== memberUserId);
      await storageDb.update('teams', teamId, {
        memberIds,
        updatedAt: getIsoTimestamp(),
      });
    }

    await activityService.logActivity({
      teamId,
      userId: memberUserId,
      userName: memberDisplayName,
      action: 'MEMBER_REMOVED',
      details: `${memberDisplayName} was removed by ${removerName}`,
    });
  },

  async leaveTeam(
    teamId: string,
    userId: string,
    userDisplayName: string
  ): Promise<void> {
    const memberId = `${teamId}_${userId}`;
    await storageDb.delete('teamMembers', memberId);

    const team = await storageDb.get<Team>('teams', teamId);
    if (team) {
      const memberIds = (team.memberIds || []).filter((id) => id !== userId);
      await storageDb.update('teams', teamId, {
        memberIds,
        updatedAt: getIsoTimestamp(),
      });
    }

    await activityService.logActivity({
      teamId,
      userId,
      userName: userDisplayName,
      action: 'MEMBER_REMOVED',
      details: `${userDisplayName} left the team`,
    });
  },
};
