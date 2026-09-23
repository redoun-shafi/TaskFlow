import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { teamService } from '../services/teamService';
import { Team, TeamMember, TeamInvitation, TeamRole } from '../types';

interface TeamContextValue {
  teams: Team[];
  currentTeam: Team | null;
  currentRole: TeamRole;
  teamMembers: TeamMember[];
  invitations: TeamInvitation[];
  loadingTeams: boolean;
  setCurrentTeamId: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  createTeam: (name: string, description: string) => Promise<Team>;
  acceptInvitation: (invitation: TeamInvitation) => Promise<void>;
  rejectInvitation: (invitation: TeamInvitation) => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  currentTeam: null,
  currentRole: 'MEMBER',
  teamMembers: [],
  invitations: [],
  loadingTeams: true,
  setCurrentTeamId: () => {},
  refreshTeams: async () => {},
  refreshInvitations: async () => {},
  createTeam: async () => ({} as Team),
  acceptInvitation: async () => {},
  rejectInvitation: async () => {},
});

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [currentRole, setCurrentRole] = useState<TeamRole>('MEMBER');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const refreshInvitations = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const invs = await teamService.getPendingInvitationsForEmail(currentUser.email);
      setInvitations(invs);
    } catch (e) {
      console.warn('Could not load invitations:', e);
    }
  }, [currentUser?.email]);

  const loadMembersForTeam = useCallback(async (team: Team) => {
    if (!currentUser) return;
    try {
      const members = await teamService.getTeamMembers(team.id);
      setTeamMembers(members);
      const myMembership = members.find((m) => m.userId === currentUser.uid);
      if (myMembership) {
        setCurrentRole(myMembership.role);
      } else if (team.ownerId === currentUser.uid) {
        setCurrentRole('OWNER');
      } else {
        setCurrentRole('MEMBER');
      }
    } catch (e) {
      console.warn('Could not load team members:', e);
      if (team.ownerId === currentUser.uid) {
        setCurrentRole('OWNER');
      }
    }
  }, [currentUser]);

  const refreshTeams = useCallback(async () => {
    if (!currentUser) {
      setTeams([]);
      setCurrentTeam(null);
      setLoadingTeams(false);
      return;
    }
    setLoadingTeams(true);
    try {
      const userTeams = await teamService.getUserTeams(currentUser.uid);
      setTeams(userTeams);

      // Auto-create default team if brand new user has no teams
      if (userTeams.length === 0) {
        const defaultName = `${userProfile?.displayName || 'My'} Workspace`;
        const newTeam = await teamService.createTeam(
          defaultName,
          'Your initial team workspace in TaskFlow',
          {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: userProfile?.displayName || currentUser.displayName,
            photoURL: userProfile?.photoURL || currentUser.photoURL,
          }
        );
        setTeams([newTeam]);
        setCurrentTeam(newTeam);
        await loadMembersForTeam(newTeam);
      } else {
        // Keep selected team or default to first
        setCurrentTeam((prev) => {
          const matched = prev ? userTeams.find((t) => t.id === prev.id) : null;
          const selected = matched || userTeams[0];
          loadMembersForTeam(selected);
          return selected;
        });
      }
    } catch (e) {
      console.error('Failed to load user teams:', e);
    } finally {
      setLoadingTeams(false);
    }
  }, [currentUser, userProfile, loadMembersForTeam]);

  useEffect(() => {
    if (currentUser) {
      refreshTeams();
      refreshInvitations();
    } else {
      setTeams([]);
      setCurrentTeam(null);
      setTeamMembers([]);
      setInvitations([]);
      setLoadingTeams(false);
    }
  }, [currentUser, refreshTeams, refreshInvitations]);

  const setCurrentTeamId = (teamId: string) => {
    const found = teams.find((t) => t.id === teamId);
    if (found) {
      setCurrentTeam(found);
      loadMembersForTeam(found);
    }
  };

  const createTeam = async (name: string, description: string) => {
    if (!currentUser) throw new Error('Must be authenticated');
    const created = await teamService.createTeam(name, description, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: userProfile?.displayName || currentUser.displayName,
      photoURL: userProfile?.photoURL || currentUser.photoURL,
    });
    setTeams((prev) => [created, ...prev]);
    setCurrentTeam(created);
    await loadMembersForTeam(created);
    return created;
  };

  const acceptInvitation = async (invitation: TeamInvitation) => {
    if (!currentUser) return;
    await teamService.respondToInvitation(invitation, true, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: userProfile?.displayName || currentUser.displayName,
      photoURL: userProfile?.photoURL || currentUser.photoURL,
    });
    await refreshTeams();
    await refreshInvitations();
  };

  const rejectInvitation = async (invitation: TeamInvitation) => {
    if (!currentUser) return;
    await teamService.respondToInvitation(invitation, false, {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: userProfile?.displayName || currentUser.displayName,
      photoURL: userProfile?.photoURL || currentUser.photoURL,
    });
    await refreshInvitations();
  };

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        currentRole,
        teamMembers,
        invitations,
        loadingTeams,
        setCurrentTeamId,
        refreshTeams,
        refreshInvitations,
        createTeam,
        acceptInvitation,
        rejectInvitation,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => useContext(TeamContext);
