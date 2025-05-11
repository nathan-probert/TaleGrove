'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import {
  fetchGroups,
  createGroup,
  fetchGroupInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation,
  getUserId,
} from '@/lib/supabase';
import { Group, GroupMember } from '@/types';

export default function FriendsPage() {
  const router = useRouter(); // Initialize router
  const [userId, setUserId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [invitations, setInvitations] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const id = await getUserId();
      if (id) {
        setUserId(id);
      } else {
        console.error('User not found');
        setError('User not authenticated');
        // Optionally redirect to login
        // router.push('/signin');
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [userGroups, invites] = await Promise.all([
          fetchGroups(userId),
          fetchGroupInvitations(userId)
        ]);
        setGroups(userGroups);
        setInvitations(invites);
      } catch (err: any) {
        console.error('Error loading friends data:', err);
        setError(err.message || 'Failed to load data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [userId]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !userId) return;
    try {
      const group = await createGroup(newGroupName, userId);
      setGroups((prev) => [...prev, group]);
      setNewGroupName('');
      // Navigate to the newly created group's page
      router.push(`/groups/${group.id}`);
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group.');
    }
  };

  const handleAcceptInvite = async (groupId: string, groupName: string | null) => {
    if (!userId) return;
    try {
      await acceptGroupInvitation(groupId, userId);
      setInvitations((prev) => prev.filter((inv) => inv.group_id !== groupId));
      // Add the accepted group to the list immediately or refetch
      // Refetching is simpler if group details beyond id/name are needed
      const updatedGroups = await fetchGroups(userId);
      setGroups(updatedGroups);
      alert(`Joined group: ${groupName || 'Unknown Name'}`);
    } catch (err) {
      console.error('Error accepting invite:', err);
      alert('Failed to accept invitation.');
    }
  };

  const handleRejectInvite = async (groupId: string) => {
    if (!userId) return;
    try {
      await rejectGroupInvitation(groupId, userId);
      setInvitations((prev) => prev.filter((inv) => inv.group_id !== groupId));
    } catch (err) {
      console.error('Error rejecting invite:', err);
      alert('Failed to reject invitation.');
    }
  };

  // Navigate to the selected group's page
  const handleSelectGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`);
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-background text-foreground"><div className="loader">Loading...</div></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md shadow-md">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl bg-background text-foreground">
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-8 text-center">Friends & Groups</h1>

      {/* Create Group */}
      <div className="mb-10 p-6 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Create a New Group</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Enter group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="border border-grey3 bg-background text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-link focus:border-transparent flex-grow shadow-sm"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            className="bg-primary hover:opacity-80 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-link focus:ring-opacity-50"
          >
            Create & Open
          </button>
        </div>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="mb-10 p-6 bg-secondary rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Pending Invitations</h2>
          <ul className="space-y-3">
            {invitations.map((invite) => (
              <li key={invite.group_id} className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border border-grey2 rounded-lg bg-grey5 hover:shadow-md transition-shadow duration-150">
                <span className="flex-grow text-foreground text-center sm:text-left">
                  Join group: <strong className="font-medium text-link">{invite.group_name || 'Unnamed Group'}</strong>?
                </span>
                <div className="flex gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => handleAcceptInvite(invite.group_id, invite.group_name)}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ease-in-out shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectInvite(invite.group_id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-150 ease-in-out shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Group List */}
      <div className="p-6 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Your Groups</h2>
        {groups.length > 0 ? (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  className="w-full text-left px-5 py-3 rounded-lg bg-grey5 hover:bg-grey4 text-foreground hover:text-link transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-link focus:ring-opacity-50 shadow-sm hover:shadow-md"
                  onClick={() => handleSelectGroup(group.id ?? "")}
                >
                  {group.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-grey italic text-center py-4">You are not a member of any groups yet. Create one or accept an invitation!</p>
        )}
      </div>

      {/* Removed Group Members, Invite, and Recommendations sections */}
    </div>
  );
}
