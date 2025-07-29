

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."copy_user_to_users"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  display_name text;
begin
  display_name := new.raw_user_meta_data->>'display_name';

  insert into public.users (id, display_name, email)
  values (new.id, display_name, new.email);

  return new;
end;
$$;


ALTER FUNCTION "public"."copy_user_to_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_folder_ancestry"("folder_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "parent_id" "uuid", "depth" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE folder_tree AS (
    SELECT 
      f.id,
      f.name,
      f.parent_id,
      0 AS depth
    FROM folders f
    WHERE f.id = folder_id
    
    UNION ALL
    
    SELECT
      parent.id,
      parent.name,
      parent.parent_id,
      ft.depth + 1
    FROM folders parent
    INNER JOIN folder_tree ft ON ft.parent_id = parent.id
  )
  SELECT * FROM folder_tree ORDER BY depth ASC;
END;
$$;


ALTER FUNCTION "public"."get_folder_ancestry"("folder_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.display_name);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error inserting user: %', SQLERRM;
      RETURN NULL;
  END;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_admin"("_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = _group_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_group_admin"("_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_default_sort_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.sort_order is null then
    select coalesce(max(sort_order), 0) + 1 into new.sort_order
    from folder_books
    where folder_id = new.folder_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_default_sort_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_sort_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1
    INTO NEW.sort_order
    FROM folder_books
    WHERE folder_id = NEW.folder_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_sort_order"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."book_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "author" "text" NOT NULL,
    "status" "text"
);


ALTER TABLE "public"."book_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."books" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "author" "text" NOT NULL,
    "rating" integer,
    "notes" "text",
    "book_id" "text",
    "isbn" "text",
    "cover_url" "text",
    "status" "text",
    "categories" "text"[],
    "date_read" "date",
    CONSTRAINT "books_date_read_check" CHECK (("date_read" <= CURRENT_DATE)),
    CONSTRAINT "books_rating_check" CHECK ((("rating" >= 0) AND ("rating" <= 10))),
    CONSTRAINT "status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'reading'::"text", 'wishlist'::"text"])))
);


ALTER TABLE "public"."books" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folder_books" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "folder_id" "uuid" NOT NULL,
    "book_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "sort_order" integer
);

ALTER TABLE ONLY "public"."folder_books" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."folder_books" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "user_id" "uuid",
    "slug" "text",
    "sort_order" integer
);


ALTER TABLE "public"."folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_book_recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "author" "text" NOT NULL,
    "status" "jsonb"
);


ALTER TABLE "public"."group_book_recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "group_name" "text"
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."book_recommendations"
    ADD CONSTRAINT "book_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."book_recommendations"
    ADD CONSTRAINT "book_recommendations_user_title_author_unique" UNIQUE ("user_id", "title", "author");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folder_books"
    ADD CONSTRAINT "folder_books_folder_id_book_id_key" UNIQUE ("folder_id", "book_id");



ALTER TABLE ONLY "public"."folder_books"
    ADD CONSTRAINT "folder_books_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_book_recommendations"
    ADD CONSTRAINT "group_book_recommendations_group_title_author_unique" UNIQUE ("group_id", "title", "author");



ALTER TABLE ONLY "public"."group_book_recommendations"
    ADD CONSTRAINT "group_book_recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "unique_member_per_group" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "unique_user_book_id" UNIQUE ("user_id", "book_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "auto_sort_order" BEFORE INSERT ON "public"."folder_books" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_sort_order"();



CREATE OR REPLACE TRIGGER "set_sort_order_trigger" BEFORE INSERT ON "public"."folder_books" FOR EACH ROW EXECUTE FUNCTION "public"."set_sort_order"();



ALTER TABLE ONLY "public"."book_recommendations"
    ADD CONSTRAINT "book_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_books"
    ADD CONSTRAINT "folder_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_books"
    ADD CONSTRAINT "folder_books_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_books"
    ADD CONSTRAINT "folder_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folders"
    ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_book_recommendations"
    ADD CONSTRAINT "group_book_recommendations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can invite members" ON "public"."group_members" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "group_members_1"."user_id"
   FROM "public"."group_members" "group_members_1"
  WHERE (("group_members_1"."group_id" = "group_members_1"."group_id") AND ("group_members_1"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage groups" ON "public"."groups" USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"()) AND ("group_members"."role" = 'admin'::"text")))));



CREATE POLICY "Admins manage members" ON "public"."group_members" USING ((EXISTS ( SELECT 1
   FROM "public"."group_members" "gm"
  WHERE (("gm"."group_id" = "group_members"."group_id") AND ("gm"."user_id" = "auth"."uid"()) AND ("gm"."role" = 'admin'::"text")))));



CREATE POLICY "Allow access to books of users in same group" ON "public"."books" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."group_members" "gm1"
     JOIN "public"."group_members" "gm2" ON (("gm1"."group_id" = "gm2"."group_id")))
  WHERE (("gm1"."user_id" = "auth"."uid"()) AND ("gm2"."user_id" = "books"."user_id")))));



CREATE POLICY "Allow authenticated users to create group members" ON "public"."group_members" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow authenticated users to create groups" ON "public"."groups" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow user to update their folder_books" ON "public"."folder_books" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to delete their own books" ON "public"."books" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to insert a book" ON "public"."books" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to see books without personal data" ON "public"."books" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IS NULL)));



CREATE POLICY "Allow users to select their own books" ON "public"."books" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow users to update their own books" ON "public"."books" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can create groups" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Can read own groups" ON "public"."groups" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Delete own folder_books" ON "public"."folder_books" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Group members can view groups" ON "public"."groups" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Group visibility" ON "public"."groups" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Groups: Insert" ON "public"."groups" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Groups: Select" ON "public"."groups" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."group_members"
  WHERE (("group_members"."group_id" = "groups"."id") AND ("group_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Groups: Update/Delete" ON "public"."groups" USING ("public"."is_group_admin"("id"));



CREATE POLICY "Insert own folder_books" ON "public"."folder_books" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Members: Admin Access" ON "public"."group_members" USING ("public"."is_group_admin"("group_id")) WITH CHECK ("public"."is_group_admin"("group_id"));



CREATE POLICY "Members: Select" ON "public"."group_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Read own group membership" ON "public"."group_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Select own folder_books" ON "public"."folder_books" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "User can accept invitation" ON "public"."group_members" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("role" = 'invited'::"text"))) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("role" = 'member'::"text")));



CREATE POLICY "User can reject invitation" ON "public"."group_members" FOR DELETE USING ((("user_id" = "auth"."uid"()) AND ("role" = 'invited'::"text")));



CREATE POLICY "Users can delete their own recommendations" ON "public"."book_recommendations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own folders" ON "public"."folders" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own recommendations" ON "public"."book_recommendations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own folder-books" ON "public"."folder_books" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own folders" ON "public"."folders" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read their own recommendations" ON "public"."book_recommendations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own recommendations" ON "public"."book_recommendations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their memberships" ON "public"."group_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "View own memberships" ON "public"."group_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."book_recommendations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."books" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folder_books" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."folders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_folder_books" ON "public"."folder_books" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."copy_user_to_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."copy_user_to_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."copy_user_to_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_folder_ancestry"("folder_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_folder_ancestry"("folder_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_folder_ancestry"("folder_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_group_admin"("_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_admin"("_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_admin"("_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_sort_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_sort_order"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_sort_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_sort_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_sort_order"() TO "service_role";


















GRANT ALL ON TABLE "public"."book_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."book_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."book_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."books" TO "anon";
GRANT ALL ON TABLE "public"."books" TO "authenticated";
GRANT ALL ON TABLE "public"."books" TO "service_role";



GRANT ALL ON TABLE "public"."folder_books" TO "anon";
GRANT ALL ON TABLE "public"."folder_books" TO "authenticated";
GRANT ALL ON TABLE "public"."folder_books" TO "service_role";



GRANT ALL ON TABLE "public"."folders" TO "anon";
GRANT ALL ON TABLE "public"."folders" TO "authenticated";
GRANT ALL ON TABLE "public"."folders" TO "service_role";



GRANT ALL ON TABLE "public"."group_book_recommendations" TO "anon";
GRANT ALL ON TABLE "public"."group_book_recommendations" TO "authenticated";
GRANT ALL ON TABLE "public"."group_book_recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
