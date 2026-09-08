-- Fix bug #13: group_members INSERT let any authenticated user join any group as any role
-- (WITH CHECK (auth.uid() IS NOT NULL)). An attacker could self-insert as 'admin'
-- into any group and gain full control via is_group_admin(), or forge rows for others.
--
-- Legitimate app writes (see origin/feat/add-friends src/lib/supabase.tsx):
--   1. createGroup: creator inserts self as 'admin' right after creating the group
--      (group has zero members at that point).
--   2. sendGroupInvitationId: a group admin inserts another user as 'invited'.
-- Accept (UPDATE invited->member) / reject (DELETE invited) are covered by existing
-- UPDATE/DELETE policies and need no change.
--
-- Replace the open policy with two narrow INSERT policies:
--   1. "Group creators can add themselves as first admin": self-insert as admin
--      only when the group has no members yet.
--   2. "Admins can invite members": existing admins can insert others as
--      'invited'/'member', never directly as 'admin' (promotion stays on the
--      admin-only UPDATE path).
--
-- NOTE: the emptiness check MUST bypass RLS. The SELECT policy on group_members
-- only shows a user their own rows, so a plain NOT EXISTS subquery in the policy
-- would be blind to other members' rows and wrongly report non-empty groups as
-- empty to non-members. Hence the SECURITY DEFINER helper below (same pattern as
-- the existing is_group_admin function).

-- Helper: true when a group has no membership rows (bypasses RLS by design).
CREATE OR REPLACE FUNCTION "public"."is_group_empty"("_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id
  );
$$;

GRANT ALL ON FUNCTION "public"."is_group_empty"("_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_empty"("_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_empty"("_group_id" "uuid") TO "service_role";

DROP POLICY IF EXISTS "Authenticated users can create group members" ON "public"."group_members";

CREATE POLICY "Group creators can add themselves as first admin"
  ON "public"."group_members" FOR INSERT TO "authenticated"
  WITH CHECK (
    "user_id" = "auth"."uid"()
    AND "role" = 'admin'
    AND "public"."is_group_empty"("group_id")
  );

CREATE POLICY "Admins can invite members"
  ON "public"."group_members" FOR INSERT TO "authenticated"
  WITH CHECK (
    "public"."is_group_admin"("group_id")
    AND "role" IN ('invited', 'member')
  );
