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
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Team, TeamMember, TeamInvitation, TeamRole, UserProfile } from '../types';
import { activityService } from './activityService';
import { notificationService } from './notificationService';

export const teamService = {
  async getUserTeams(userId: string): Promise<Team[]> {
    const colRef = collection(db, 'teams');
    try {
      const q = query(colRef, where('memberIds', 'array-contains', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Team));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'teams');
    }
  },

  async getTeam(teamId: string): Promise<Team | null> {
    const docRef = doc(db, 'teams', teamId);
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Team;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `teams/${teamId}`);
    }
  },

  async createTeam(
    name: string,
    description: string,
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ): Promise<Team> {
    const teamRef = doc(collection(db, 'teams'));
    const teamData: Team = {
      id: teamRef.id,
      name: name.trim(),
      description: description.trim(),
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(teamRef, teamData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teams/${teamRef.id}`);
    }

    // Create TeamMember record
    const memberId = `${teamRef.id}_${user.uid}`;
    const memberRef = doc(db, 'teamMembers', memberId);
    try {
      await setDoc(memberRef, {
        id: memberId,
        teamId: teamRef.id,
        userId: user.uid,
        userEmail: user.email || '',
        userDisplayName: user.displayName || 'Owner',
        userPhotoURL: user.photoURL || '',
        role: 'OWNER' as TeamRole,
        joinedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teamMembers/${memberId}`);
    }

    await activityService.logActivity({
      teamId: teamRef.id,
      userId: user.uid,
      userName: user.displayName || 'Owner',
      userPhotoURL: user.photoURL || '',
      action: 'MEMBER_JOINED',
      details: `Created team workspace "${name.trim()}"`,
    });

    return teamData;
  },

  async updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'description'>>): Promise<void> {
    const docRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
    }
  },

  async deleteTeam(teamId: string): Promise<void> {
    const docRef = doc(db, 'teams', teamId);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${teamId}`);
    }
  },

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const colRef = collection(db, 'teamMembers');
    try {
      const q = query(colRef, where('teamId', '==', teamId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `teamMembers`);
    }
  },

  async inviteMember(
    teamId: string,
    teamName: string,
    inviter: { uid: string; displayName: string | null },
    inviteeEmail: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<string> {
    const normalizedEmail = inviteeEmail.trim().toLowerCase();
    const invRef = doc(collection(db, 'teamInvitations'));
    const invData: TeamInvitation = {
      id: invRef.id,
      teamId,
      teamName,
      inviterId: inviter.uid,
      inviterName: inviter.displayName || 'Team Member',
      inviteeEmail: normalizedEmail,
      role,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(invRef, invData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teamInvitations/${invRef.id}`);
    }

    // Check if recipient is an existing user and send in-app notification
    try {
      const usersRef = collection(db, 'users');
      const uq = query(usersRef, where('email', '==', normalizedEmail));
      const uSnap = await getDocs(uq);
      if (!uSnap.empty) {
        const recipientUser = uSnap.docs[0].data() as UserProfile;
        await notificationService.sendNotification({
          userId: recipientUser.id,
          title: 'New Team Invitation',
          message: `${inviter.displayName || 'Someone'} invited you to join "${teamName}" as ${role}.`,
          type: 'TEAM_INVITE',
          link: '/teams',
          metadata: { teamId, invitationId: invRef.id },
        });
      }
    } catch (e) {
      console.warn('Could not dispatch direct in-app notification to invitee:', e);
    }

    return invRef.id;
  },

  async getPendingInvitationsForEmail(email: string): Promise<TeamInvitation[]> {
    const normalizedEmail = email.trim().toLowerCase();
    const colRef = collection(db, 'teamInvitations');
    try {
      const q = query(
        colRef,
        where('inviteeEmail', '==', normalizedEmail),
        where('status', '==', 'PENDING')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInvitation));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'teamInvitations');
    }
  },

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    const colRef = collection(db, 'teamInvitations');
    try {
      const q = query(colRef, where('teamId', '==', teamId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamInvitation));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'teamInvitations');
    }
  },

  async respondToInvitation(
    invitation: TeamInvitation,
    accept: boolean,
    user: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }
  ): Promise<void> {
    const invRef = doc(db, 'teamInvitations', invitation.id);
    const newStatus = accept ? 'ACCEPTED' : 'REJECTED';

    try {
      await updateDoc(invRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teamInvitations/${invitation.id}`);
    }

    if (accept) {
      // Add to team's memberIds
      const teamRef = doc(db, 'teams', invitation.teamId);
      try {
        await updateDoc(teamRef, {
          memberIds: arrayUnion(user.uid),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `teams/${invitation.teamId}`);
      }

      // Add to teamMembers collection
      const memberId = `${invitation.teamId}_${user.uid}`;
      const memberRef = doc(db, 'teamMembers', memberId);
      try {
        await setDoc(memberRef, {
          id: memberId,
          teamId: invitation.teamId,
          userId: user.uid,
          userEmail: user.email || '',
          userDisplayName: user.displayName || 'Member',
          userPhotoURL: user.photoURL || '',
          role: invitation.role,
          joinedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `teamMembers/${memberId}`);
      }

      // Log activity
      await activityService.logActivity({
        teamId: invitation.teamId,
        userId: user.uid,
        userName: user.displayName || 'Member',
        userPhotoURL: user.photoURL || '',
        action: 'MEMBER_JOINED',
        details: `Joined the team as ${invitation.role}`,
      });

      // Notify inviter
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
    const memberRef = doc(db, 'teamMembers', memberId);
    try {
      await updateDoc(memberRef, { role: newRole });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teamMembers/${memberId}`);
    }
  },

  async removeMember(
    teamId: string,
    memberUserId: string,
    removerName: string,
    memberDisplayName: string
  ): Promise<void> {
    const memberId = `${teamId}_${memberUserId}`;
    const memberRef = doc(db, 'teamMembers', memberId);
    try {
      await deleteDoc(memberRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teamMembers/${memberId}`);
    }

    const teamRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(teamRef, {
        memberIds: arrayRemove(memberUserId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
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
    const memberRef = doc(db, 'teamMembers', memberId);
    try {
      await deleteDoc(memberRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teamMembers/${memberId}`);
    }

    const teamRef = doc(db, 'teams', teamId);
    try {
      await updateDoc(teamRef, {
        memberIds: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teams/${teamId}`);
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
