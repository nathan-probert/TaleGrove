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
  kickGroupMember,
  saveGroupBookRecommendation,
  getGroupRecommendations,
} from '@/lib/supabase';
import { generateGroupRecommendations } from '@/lib/gemini';
import { BookRecommendation, Group, GroupMemberWithProfile, UserBookData, GroupRole, RecommendationStatus } from '@/types';

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

  const viewGroupRecommendations = () => {
    if (!group?.id) {
      alert('Group data not loaded yet or group ID is missing.');
      return;
    }
    router.push(`/groups/${group.id}/recommendations`);
  };

  const handleGroupRecommendations = async () => {
    if (!group?.id) { // Ensure group and group.id are available
      alert('Group data not loaded yet or group ID is missing.');
      return;
    }

    if (!groupMembers.length) {
      alert('No members found in this group to generate recommendations.');
      return;
    }

    setIsLoading(true); // Indicate loading state
    setError(null);

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
            // Optionally, inform the user that data for some members couldn't be fetched
          }
        })
      );

      if (!allRecommendations.length && !allMemberBooks.length) {
        alert('Could not fetch recommendation data for any group member.');
        setIsLoading(false);
        return;
      }

      const oldGroupRecommendations = await getGroupRecommendations(userId, group.id);

      // Assuming groupRecs is an array of objects with title, author, and optionally reasoning
      const groupRecsOutput = await generateGroupRecommendations(allMemberBooks, allRecommendations, oldGroupRecommendations);
      
      if (!groupRecsOutput || groupRecsOutput.length === 0) {
        alert('No recommendations could be generated for this group.');
        setIsLoading(false);
        return;
      }

      // Save each recommendation to the database
      for (const rec of groupRecsOutput) {
        if (group?.id && rec.title && rec.author) { // Ensure necessary fields are present
          const recommendationToSave: BookRecommendation = {
            title: rec.title,
            author: rec.author,
          };
          await saveGroupBookRecommendation(userId, group.id, recommendationToSave, RecommendationStatus.Pending);
        }
      }
    } catch (error: any) {
      console.error('Error generating or saving group recommendations:', error);
      setError(error.message || 'Failed to generate or save group recommendations.');
      alert('Failed to generate or save group recommendations. See console for details.');
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-background text-foreground"><div className="loader">Loading group details...</div></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-red-100 rounded-md shadow-md">Error: {error}</div>;
  if (!group) return <div className="p-6 text-center text-grey bg-grey5 rounded-md shadow-md">Group not found.</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-3xl bg-background text-foreground">
      <button 
        onClick={() => router.back()} 
        className="mb-6 text-link hover:opacity-80 transition duration-150 ease-in-out flex items-center group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Groups
      </button>
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-8 text-center">Group: <span className="text-link">{group.name}</span></h1>

      {/* Members Section */}
      <div className="mb-8 p-6 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Members</h2>
        {groupMembers.length > 0 ? (
          <ul className="space-y-3">
            {groupMembers.map((member) => (
              <li key={member.id} className="flex items-center justify-between p-3 bg-grey5 rounded-lg hover:bg-grey4 transition-colors duration-150">
                <span className="text-foreground">
                  {member.display_name} <span className="text-sm text-grey">({member.role})</span>
                  {member.user_id === userId && <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">You</span>}
                </span>
                {currentUserRole === GroupRole.Admin && member.user_id !== userId && (
                  <button
                    onClick={() => handleKickMember(member.user_id)}
                    className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-medium transition duration-150 ease-in-out shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                  >
                    Kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-grey italic text-center py-3">No members yet. Be the first to invite someone!</p>
        )}
      </div>

      {/* Invite User Section */}
      {currentUserRole === GroupRole.Admin && (
        <div className="mb-8 p-6 bg-secondary rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-foreground mb-4">Invite User</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              placeholder="User ID or Email to invite"
              value={inviteUserId}
              onChange={(e) => setInviteUserId(e.target.value)}
              className="border border-grey3 bg-background text-foreground px-4 py-2 rounded-lg focus:ring-2 focus:ring-link focus:border-transparent flex-grow shadow-sm"
            />
            <button
              onClick={handleInviteUser}
              disabled={!inviteUserId.trim()}
              className="bg-primary hover:opacity-80 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-link focus:ring-opacity-50"
            >
              Invite
            </button>
          </div>
        </div>
      )}

      {/* Group Actions Section */}
      <div className="p-6 bg-secondary rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-foreground mb-4">Group Actions</h3>
        <button
          onClick={handleGroupRecommendations}
          disabled={groupMembers.length === 0}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.33 12c0-1.04-.464-2.012-1.236-2.728a3.993 3.993 0 00-2.732-1.042M9.668 12c0 1.04.464 2.012 1.236 2.728a3.993 3.993 0 002.732 1.042" />
          </svg>
          Generate Group Recommendations
        </button>

        <button
          onClick={viewGroupRecommendations}
          disabled={groupMembers.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition duration-150 ease-in-out shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.33 12c0-1.04-.464-2.012-1.236-2.728a3.993 3.993 0 00-2.732-1.042M9.668 12c0 1.04.464 2.012 1.236 2.728a3.993 3.993 0 002.732 1.042" />
          </svg>
          View Group Recommendations
        </button>
      </div>
    </div>
  );
}
