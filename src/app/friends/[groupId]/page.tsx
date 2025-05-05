'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  fetchGroupMembers,
  getUserId,
  sendGroupInvitationId,
  sendGroupInvitationEmail,
  getRecommendations,
  getUsersBooks,
  fetchGroupById,
  kickGroupMember, // Import the new function
} from '@/lib/supabase';
import { generateGroupRecommendations } from '@/lib/gemini';
import { BookRecommendation, Group, GroupMemberWithProfile, UserBookData, GroupRole } from '@/types'; // Import GroupRole

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [userId, setUserId] = useState('');
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithProfile[]>([]);
  const [inviteUserId, setInviteUserId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<GroupRole | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const id = await getUserId();
        if (!id) throw new Error('User not authenticated');
        setUserId(id);
      } catch (err: any) {
        console.error('User fetch error:', err);
        setError(err.message || 'User not found');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!groupId || !userId) return;

    const loadGroupData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const groupDetails = await fetchGroupById(groupId, userId);
        if (!groupDetails) throw new Error('Group not found or access denied.');
        setGroup(groupDetails);

        const members = await fetchGroupMembers(groupId);
        setGroupMembers(members);

        // Find the current user's role
        const currentUserMember = members.find(member => member.user_id === userId);
        setCurrentUserRole(currentUserMember?.role || null);

      } catch (err: any) {
        console.error('Error loading group data:', err);
        setError(err.message || 'Failed to load group data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [groupId, userId]);

  const handleInviteUser = async () => {
    if (!group?.id || !inviteUserId) return;

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(inviteUserId)) {
        await sendGroupInvitationEmail(group.id, group.name, inviteUserId);
      } else {
        await sendGroupInvitationId(group.id, group.name, inviteUserId);
      }
      alert('User invited!');
      setInviteUserId('');
      const members = await fetchGroupMembers(group.id);
      setGroupMembers(members);
    } catch (err) {
      console.error('Error inviting user:', err);
      alert('Failed to invite user.');
    }
  };

  const handleKickMember = async (memberUserIdToKick: string) => {
    if (!group?.id || !userId) return;
    if (!window.confirm('Are you sure you want to kick this member?')) return;

    try {
      await kickGroupMember(group.id, memberUserIdToKick, userId);
      alert('Member kicked successfully.');
      // Refresh member list
      const members = await fetchGroupMembers(group.id);
      setGroupMembers(members);
    } catch (err: any) {
      console.error('Error kicking member:', err);
      alert(`Failed to kick member: ${err.message}`);
    }
  };

  const handleGroupRecommendations = async () => {
    if (!group) {
      alert('Group data not loaded yet.');
      return;
    }

    if (!groupMembers.length) {
      alert('No members found in this group.');
      return;
    }

    try {
      let allRecommendations: BookRecommendation[][] = [];
      let allMemberBooks: UserBookData[][] = [];

      await Promise.all(
        groupMembers.map(async (member) => {
          try {
            const [memberRecommendations, memberBooks] = await Promise.all([
              getRecommendations(member.user_id),
              getUsersBooks(member.user_id),
            ]);
            allRecommendations.push(memberRecommendations);
            allMemberBooks.push(memberBooks);
          } catch (memberError) {
            console.error(`Error fetching data for member ${member.user_id}:`, memberError);
          }
        })
      );

      if (!allRecommendations.length && !allMemberBooks.length) {
        alert('Could not fetch data for any group member.');
        return;
      }

      const groupRecs = await generateGroupRecommendations(allMemberBooks, allRecommendations);
      console.log('Generated Group Recommendations:', groupRecs);
      alert('Group recommendations generated! Check the console.');
    } catch (error) {
      console.error('Error generating group recommendations:', error);
      alert('Failed to generate group recommendations. See console for details.');
    }
  };

  if (isLoading) return <div className="p-6">Loading group details...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!group) return <div className="p-6">Group not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="text-blue-500 hover:underline mb-4">
        &larr; Back to Groups
      </button>
      <h1 className="text-2xl font-bold">Group: {group.name}</h1>

      <div>
        <h2 className="text-xl font-semibold mb-2">Members</h2>
        {groupMembers.length > 0 ? (
          <ul className="list-disc pl-5 mb-4 space-y-1">
            {groupMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between">
                <span>
                  {member.display_name} ({member.role})
                  {member.user_id === userId && ' (You)'}
                </span>
                {currentUserRole === GroupRole.Admin && member.user_id !== userId && (
                  <button
                    onClick={() => handleKickMember(member.user_id)}
                    className="ml-4 bg-red-500 text-white px-2 py-0.5 rounded text-xs hover:bg-red-600"
                  >
                    Kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No members yet.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Invite User</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="User ID or Email to invite"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
            className="border px-2 py-1 rounded text-black flex-grow"
          />
          <button
            onClick={handleInviteUser}
            disabled={!inviteUserId.trim()}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Group Actions</h3>
        <button
          onClick={handleGroupRecommendations}
          disabled={groupMembers.length === 0}
          className="bg-purple-600 text-white px-4 py-1 rounded disabled:opacity-50"
        >
          Generate Group Recommendations
        </button>
      </div>
    </div>
  );
}
