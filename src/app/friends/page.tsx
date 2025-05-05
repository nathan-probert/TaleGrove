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
      router.push(`/friends/${group.id}`);
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
    router.push(`/friends/${groupId}`);
  };

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Friends & Groups</h1>

      {/* Create Group */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Create a New Group</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="border px-2 py-1 rounded text-black flex-grow"
          />
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim()}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            Create & Open
          </button>
        </div>
      </div>

      {/* Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Pending Invitations</h2>
          <ul className="space-y-2">
            {invitations.map((invite) => (
              <li key={invite.group_id} className="flex items-center gap-2 p-2 border rounded bg-gray-50">
                <span className="flex-grow text-black">Join group: <strong>{invite.group_name || 'Unnamed Group'}</strong>?</span>
                <button
                  onClick={() => handleAcceptInvite(invite.group_id, invite.group_name)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectInvite(invite.group_id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Reject
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Group List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Your Groups</h2>
        {groups.length > 0 ? (
          <ul className="space-y-2">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  className="w-full text-left px-4 py-2 rounded bg-gray-100 hover:bg-blue-100 text-black"
                  onClick={() => handleSelectGroup(group.id ?? "")} // Use router push
                >
                  {group.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">You are not a member of any groups yet. Create one or accept an invitation!</p>
        )}
      </div>

      {/* Removed Group Members, Invite, and Recommendations sections */}
    </div>
  );
}
