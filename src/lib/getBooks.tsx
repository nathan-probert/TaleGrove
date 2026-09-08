import supabase, { getBooksInFolder } from "@/lib/supabase";
import { Book } from "@/types";

export async function fetchUserBooksAndFolders(
  userId: string,
  parentFolderId: string,
) {
  // Fetch folders with the specified parent_id, ordered by sort_order
  const foldersRes = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (foldersRes.error) throw foldersRes.error;

  const folders = (foldersRes.data || [])
    .filter((folder) => folder.parent_id === parentFolderId)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((folder) => ({ ...folder, isFolder: true }));

  // Now get the books in the folder
  const books: Book[] = await getBooksInFolder(parentFolderId, userId);

  return [...folders, ...books];
}

export const deleteUserBook = async (id: string, userId: string) => {
  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
};
